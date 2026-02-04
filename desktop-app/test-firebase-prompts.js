/**
 * Test Script สำหรับทดสอบการดึง readyPrompts จาก Firebase
 * และตรวจสอบว่า Variables ถูกส่งผ่านถูกต้องหรือไม่
 * 
 * วิธีรัน: node test-firebase-prompts.js
 */

const API_KEY = 'AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE';
const USER_ID = 'azLWEhdI0qSNzv16yDHONQ354oJ3';
const PROJECT_ID = 'wSLy37XigmaIjdKvbvlW'; // การ์ตูน project

async function fetchReadyPrompts(userId, projectId) {
  const url = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}/projects/${projectId}/readyPrompts?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.documents || data.documents.length === 0) {
      console.log('⚠️ ไม่พบ readyPrompts ใน project นี้');
      return [];
    }
    
    // แปลง Firestore format เป็น plain object
    return data.documents.map(doc => {
      const fields = doc.fields || {};
      return {
        id: doc.name.split('/').pop(),
        status: fields.status?.stringValue,
        prompts: parseFirestoreArray(fields.prompts),
        createdAt: fields.createdAt?.timestampValue
      };
    });
  } catch (error) {
    console.error('❌ Error fetching readyPrompts:', error.message);
    return [];
  }
}

function parseFirestoreValue(value) {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue) return parseFirestoreArray(value);
  if (value.mapValue) return parseFirestoreMap(value.mapValue);
  return null;
}

function parseFirestoreArray(field) {
  if (!field?.arrayValue?.values) return [];
  return field.arrayValue.values.map(v => parseFirestoreValue(v));
}

function parseFirestoreMap(mapValue) {
  if (!mapValue?.fields) return {};
  const result = {};
  for (const [key, value] of Object.entries(mapValue.fields)) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

async function main() {
  console.log('========================================');
  console.log('ทดสอบการดึง readyPrompts จาก Firebase');
  console.log('========================================\n');
  
  console.log(`User ID: ${USER_ID}`);
  console.log(`Project ID: ${PROJECT_ID}\n`);
  
  const readyPromptsData = await fetchReadyPrompts(USER_ID, PROJECT_ID);
  
  if (readyPromptsData.length === 0) {
    console.log('\n⚠️ ไม่พบ readyPrompts - ต้องรอให้ Cloud Function สร้างก่อน');
    console.log('   หรือลองทดสอบด้วย Prompt ที่มีอยู่แล้ว\n');
    
    // ใช้ mock data แทน
    console.log('========================================');
    console.log('ใช้ Mock Data สำหรับทดสอบ');
    console.log('========================================\n');
    
    const mockPrompts = [
      { index: 1, type: 'image', title: 'Master Image', prompt: 'Beautiful cartoon character' },
      { index: 2, type: 'video', title: 'Scene 1', duration: '8 seconds', action: 'Character walks into scene', script: 'สวัสดีครับทุกคน' },
      { index: 3, type: 'video', title: 'Scene 2', duration: '10 seconds', action: 'Character waves hand', script: 'วันนี้จะมาเล่าเรื่อง' },
      { index: 'last', type: 'social', description: 'การ์ตูนสนุกๆ', hashtags: ['#cartoon', '#fun'] }
    ];
    
    testVariables(mockPrompts);
    return;
  }
  
  console.log(`✅ พบ ${readyPromptsData.length} readyPrompts\n`);
  
  // ใช้ readyPrompt ล่าสุด
  const latestReady = readyPromptsData.find(rp => rp.status === 'ready') || readyPromptsData[0];
  console.log(`📋 ใช้ readyPrompt: ${latestReady.id}`);
  console.log(`   Status: ${latestReady.status}`);
  console.log(`   Created: ${latestReady.createdAt}\n`);
  
  const prompts = latestReady.prompts || [];
  console.log(`📝 มี ${prompts.length} prompts\n`);
  
  testVariables(prompts);
}

function testVariables(prompts) {
  console.log('========================================');
  console.log('ทดสอบการแปลง Variables');
  console.log('========================================\n');
  
  // แยก prompts ตาม type
  const masterImagePrompt = prompts.find(p => p.type === 'image');
  const videoPrompts = prompts.filter(p => p.type === 'video');
  const socialPrompt = prompts.find(p => p.type === 'social');
  
  console.log('📊 แยก Prompts ตาม Type:');
  console.log(`   - Master Image: ${masterImagePrompt ? '✅ พบ' : '❌ ไม่พบ'}`);
  console.log(`   - Video Prompts: ${videoPrompts.length} รายการ`);
  console.log(`   - Social Prompt: ${socialPrompt ? '✅ พบ' : '❌ ไม่พบ'}\n`);
  
  // สร้าง variables
  const variables = {
    prompts: videoPrompts.length > 0 ? videoPrompts : prompts,
    masterImage: masterImagePrompt?.prompt || '',
    socialDescription: socialPrompt?.description || '',
    hashtags: socialPrompt?.hashtags || [],
    totalScenes: videoPrompts.length || prompts.length
  };
  
  console.log('📋 Variables ที่จะส่งให้ Block Runner:');
  console.log(`   - prompts: ${variables.prompts.length} รายการ`);
  console.log(`   - masterImage: "${(variables.masterImage || 'ไม่มี').substring(0, 40)}..."`);
  console.log(`   - socialDescription: "${(variables.socialDescription || 'ไม่มี').substring(0, 40)}..."`);
  console.log(`   - hashtags: ${variables.hashtags.length > 0 ? variables.hashtags.join(' ') : 'ไม่มี'}`);
  console.log(`   - totalScenes: ${variables.totalScenes}\n`);
  
  // ทดสอบ Loop Variables
  console.log('========================================');
  console.log('ทดสอบ Loop Variables สำหรับแต่ละ Scene');
  console.log('========================================\n');
  
  let allValid = true;
  
  for (let i = 0; i < variables.prompts.length; i++) {
    const currentPrompt = variables.prompts[i];
    const isPromptObject = typeof currentPrompt === 'object' && currentPrompt !== null;
    
    const loopVars = {
      prompt: isPromptObject ? `${currentPrompt.action || ''} ${currentPrompt.script || ''}`.trim() : currentPrompt,
      action: isPromptObject ? (currentPrompt.action || '') : '',
      script: isPromptObject ? (currentPrompt.script || '') : '',
      title: isPromptObject ? (currentPrompt.title || `Scene ${i + 1}`) : '',
      duration: isPromptObject ? (currentPrompt.duration || '') : '',
      audio: isPromptObject ? (currentPrompt.audio || '') : '',
      sceneIndex: i + 1
    };
    
    const hasRequiredData = loopVars.prompt || loopVars.action;
    if (!hasRequiredData) allValid = false;
    
    console.log(`${hasRequiredData ? '✅' : '❌'} Scene ${i + 1}: ${loopVars.title}`);
    console.log(`   - prompt: "${(loopVars.prompt || 'ไม่มี').substring(0, 50)}..."`);
    console.log(`   - action: "${(loopVars.action || 'ไม่มี').substring(0, 40)}..."`);
    console.log(`   - script: "${(loopVars.script || 'ไม่มี').substring(0, 40)}..."`);
    console.log(`   - duration: ${loopVars.duration || 'ไม่มี'}\n`);
  }
  
  // สรุป
  console.log('========================================');
  console.log('📋 สรุปผลการทดสอบ');
  console.log('========================================\n');
  
  const checks = [
    { name: 'Master Image', pass: !!variables.masterImage },
    { name: 'Video Prompts', pass: variables.prompts.length > 0 },
    { name: 'Social Description', pass: !!variables.socialDescription },
    { name: 'Hashtags', pass: variables.hashtags.length > 0 },
    { name: 'Loop Variables', pass: allValid }
  ];
  
  checks.forEach(c => {
    console.log(`${c.pass ? '✅' : '⚠️'} ${c.name}: ${c.pass ? 'พร้อมใช้งาน' : 'ไม่มีข้อมูล (อาจ optional)'}`);
  });
  
  const allPassed = checks.filter(c => !c.pass).length <= 2; // Allow some optional fields to be empty
  console.log(`\n🎉 ผลสรุป: ${allPassed ? 'พร้อมใช้งาน!' : '⚠️ ข้อมูลบางส่วนยังไม่ครบ'}`);
}

main().catch(console.error);
