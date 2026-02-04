const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenAI } = require('@google/genai');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

// Force redeploy: 2026-02-04 - Gemini 2.5 Migration (New SDK)
admin.initializeApp();

// Initialize Gemini 2.5 (New SDK: @google/genai)
let genAIClient = null;

function getGeminiClient() {
  if (!genAIClient) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    console.log(`🔑 Gemini API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND'}`);
    
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is not set in environment!');
      throw new Error('GEMINI_API_KEY is not configured');
    }
    
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Helper: Call Gemini with JSON response (New SDK)
async function callGemini(prompt, systemInstruction = '') {
  const ai = getGeminiClient();
  
  const fullPrompt = systemInstruction 
    ? `${systemInstruction}\n\nIMPORTANT: Return valid JSON only, no markdown.\n\n${prompt}`
    : `IMPORTANT: Return valid JSON only, no markdown.\n\n${prompt}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: fullPrompt
  });
  
  const text = response.text || '';
  
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse Gemini response as JSON: ${text.substring(0, 200)}`);
  }
}

// Function: Reset Daily Post Counts (Scheduled 00:00 BKK)
exports.resetDailyPostCounts = functions.pubsub.schedule('0 0 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const batch = admin.firestore().batch();
    const usersSnapshot = await admin.firestore().collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const accountsSnapshot = await admin.firestore()
        .collection('users').doc(userDoc.id)
        .collection('accounts').get();

      for (const accountDoc of accountsSnapshot.docs) {
        batch.update(accountDoc.ref, { postsToday: 0 });
      }
    }

    await batch.commit();
    console.log('Daily post counts reset');
  });


// Helper: Normalize Percentages (Auto-Correction)
function normalizePercentages(items) {
  if (!items || items.length === 0) return [];

  let total = 0;
  // 1. Initial Pass: Parse integers
  items.forEach(item => {
    item.percentage = parseInt(item.percentage) || 0;
    total += item.percentage;
  });

  // 2. Safety Valve: If total is 0 or wildly invalid (e.g. > 110 or < 90), reset to equal distribution
  // We use a loose threshold to allow minor user errors to be fixed by math, but major ones get a hard reset.
  if (total < 90 || total > 110) {
    const split = Math.floor(100 / items.length);
    let remainder = 100 - (split * items.length);

    items.forEach(item => {
      item.percentage = split;
      if (remainder > 0) {
        item.percentage += 1;
        remainder--;
      }
    });
  } else {
    // 3. Precise Adjustment: If close to 100 (e.g. 99 or 101), just fix the last item
    if (total !== 100) {
      const diff = 100 - total;
      items[items.length - 1].percentage += diff;
    }
  }

  return items;
}

// ============================================
// SHARED HELPER: Generate Titles and Tags for all platforms (Gemini)
// ============================================
async function generateTitlesAndTags(params) {
  const {
    episodeTopic,
    episodeDesc,
    modeCategory,
    expandedPrompts
  } = params;

  const prompt = `You are a social media expert. Generate engaging titles and tags for a video.

=== VIDEO TOPIC ===
Title: "${episodeTopic}"
Description: ${episodeDesc || 'N/A'}
Category: ${modeCategory || 'Entertainment'}
Number of Scenes: ${expandedPrompts?.length || 0}

=== OUTPUT FORMAT (JSON) ===
{
  "titles": {
    "tiktok": "Catchy TikTok title in Thai (max 100 chars)",
    "facebook": "Engaging Facebook title in Thai (max 150 chars)",
    "instagram": "Instagram caption in Thai (max 100 chars)",
    "youtube": "SEO-friendly YouTube title in Thai (max 100 chars)"
  },
  "tags": {
    "tiktok": ["5 relevant trending tags WITHOUT # symbol"],
    "facebook": ["3 engaging tags"],
    "instagram": ["30 relevant hashtags for maximum reach WITHOUT # symbol"],
    "youtube": ["10 SEO optimized tags"]
  }
}

IMPORTANT:
- ALL titles MUST be in Thai
- ALL tags must be relevant to "${episodeTopic}"
- Tags must NOT include the # symbol
- Output valid JSON only, no markdown`;

  try {
    const result = await callGemini(prompt, 'You are a social media expert. Output valid JSON only.');
    return result;
  } catch (err) {
    console.error('generateTitlesAndTags error:', err.message);
    // Fallback
    return {
      titles: {
        tiktok: episodeTopic || 'Video',
        facebook: episodeTopic || 'Video',
        instagram: episodeTopic || 'Video',
        youtube: episodeTopic || 'Video'
      },
      tags: {
        tiktok: ['video', 'viral', 'fyp', 'trending', 'content'],
        facebook: ['video', 'content', 'watch'],
        instagram: Array(30).fill('content'),
        youtube: Array(10).fill('video')
      }
    };
  }
}

// ============================================
// SHARED HELPER: Extract raw scenes from Mode data
// ============================================
function extractRawScenesFromMode(modeData) {
  const rawScenes = [];
  const characters = modeData.characters || [];
  const locations = modeData.locations || [];

  (modeData.blocks || []).forEach((block, blockIndex) => {
    // If block has evolution steps, extract each step as a scene
    if (block.evolution && block.evolution.length > 0) {
      block.evolution.forEach((step, stepIndex) => {
        const dialogues = (step.dialogues || []).map(d => {
          const char = characters.find(c => c.id === d.characterId);
          return {
            character: char?.name || 'Unknown',
            text: d.text || ''
          };
        });

        const location = locations.find(l => l.id === step.locationId);

        rawScenes.push({
          sceneNumber: rawScenes.length + 1,
          blockTitle: block.title || `Scene ${blockIndex + 1}`,
          visualPrompt: step.rawPrompt || block.title || '',
          rawPrompt: step.rawPrompt || '',
          sceneInstruction: step.sceneInstruction || '',
          audioAmbience: step.audioInstruction || '',
          audioInstruction: step.audioInstruction || '',
          cameraAngle: step.cameraAngle || 'wide',
          timeOfDay: step.timeOfDay || 'day',
          locationName: location?.name || '',
          dialogues: dialogues,
          dialogueDensity: step.dialogueDensity || 4 // ใช้ค่าจาก Mode Scene หรือ default 4
        });
      });
    } else {
      // Block without evolution - use block title as scene
      rawScenes.push({
        sceneNumber: rawScenes.length + 1,
        blockTitle: block.title || `Scene ${blockIndex + 1}`,
        visualPrompt: block.title || '',
        rawPrompt: '',
        audioAmbience: '',
        cameraAngle: 'wide',
        timeOfDay: 'day',
        dialogues: [],
        dialogueDensity: 4 // Default 4 ประโยค
      });
    }
  });

  return rawScenes;
}

// ============================================
// SHARED HELPER: Get Next Episode from Queue
// Supports: sequential (order asc) or random selection
// ============================================
async function getNextEpisode(projectRef, selectionMode = 'sequential') {
  const episodesRef = projectRef.collection('episodes');
  
  // Query only pending episodes
  let query = episodesRef.where('status', '==', 'pending');

  if (selectionMode === 'random') {
    // Random: fetch all pending then pick one randomly
    const snapshot = await query.get();
    if (snapshot.empty) return null;

    const randomIndex = Math.floor(Math.random() * snapshot.size);
    const doc = snapshot.docs[randomIndex];
    return { id: doc.id, ref: doc.ref, ...doc.data() };
  } else {
    // Sequential: order by 'order' field ascending, get first
    query = query.orderBy('order', 'asc').limit(1);
    const snapshot = await query.get();
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ref: doc.ref, ...doc.data() };
  }
}

// ============================================
// SHARED HELPER: Get Remaining Episode Count
// ============================================
async function getRemainingEpisodeCount(projectRef) {
  const snapshot = await projectRef.collection('episodes')
    .where('status', '==', 'pending')
    .get();
  return snapshot.size;
}


// --- 4. Generate User Key (For Extension Access) ---
// ADMIN EMAIL - can be moved to Firestore config later
const ADMIN_EMAILS = ['fxfarm.dashboard@gmail.com'];

exports.generateUserKey = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  try {
    const db = admin.firestore();

    // Check if user is admin
    const isAdmin = ADMIN_EMAILS.includes(userEmail.toLowerCase());

    // Generate unique key: base64(userId:isAdmin:timestamp:random)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const adminFlag = isAdmin ? 'ADMIN' : 'USER';
    const rawKey = `${userId}:${adminFlag}:${timestamp}:${random}`;
    const encodedKey = Buffer.from(rawKey).toString('base64');

    // Store key in user document
    await db.collection('users').doc(userId).set({
      extensionKey: {
        keyHash: Buffer.from(encodedKey).toString('base64'),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isAdmin: isAdmin,
        active: true
      }
    }, { merge: true });

    console.log(`🔑 User Key generated for ${userEmail} (Admin: ${isAdmin})`);

    return {
      success: true,
      key: encodedKey,
      isAdmin: isAdmin,
      message: isAdmin
        ? 'Admin Key generated! You have full access to recording features.'
        : 'User Key generated! You can monitor and execute scheduled jobs.'
    };

  } catch (error) {
    console.error('Error generating key:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// --- 5. Central Scheduler (The Station Master) ---
exports.scheduleJobs = functions
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 300, memory: '1GB' })
  .pubsub.schedule('every 1 minutes')
  .timeZone('UTC') // Run in UTC to handle all offsets manually
  // Force Deploy Change: v3.2 (Add GEMINI_API_KEY secret)
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    console.log(`🚂 SUPER-SCHEDULER v3.0 START: ${now.toISOString()}`);

    try {
      // 1. Get ALL Running Projects
      // NOTE: This Collection Group query requires a Composite Index on 'projects' -> 'status'.
      const runningProjectsSnap = await db.collectionGroup('projects')
        .where('status', '==', 'running')
        .get();

      if (runningProjectsSnap.empty) {
        console.log('💤 No running projects found (empty snapshot). Scheduler sleeping.');
        return;
      }

      console.log(`Found ${runningProjectsSnap.size} running projects.`);

      // 2. Group Projects by User (Optimization to fetch User Profile once)
      const projectsByUser = {};
      runningProjectsSnap.docs.forEach(doc => {
        const p = doc.data();
        const userId = doc.ref.parent.parent.id;
        if (!projectsByUser[userId]) projectsByUser[userId] = [];
        projectsByUser[userId].push({ id: doc.id, ref: doc.ref, data: p });
      });

      // 3. Process each User
      for (const userId of Object.keys(projectsByUser)) {
        try {
          // A. Fetch User Timezone
          const userDoc = await db.collection('users').doc(userId).get();
          const userTz = (userDoc.exists && userDoc.data().timezone) ? userDoc.data().timezone : 'Asia/Bangkok';

          // B. Calculate User's Local Time (Robust Method using Intl.DateTimeFormat)
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTz,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false,
            weekday: 'short'
          });

          const parts = formatter.formatToParts(now);
          const getPart = (type) => parts.find(p => p.type === type).value;

          const currentHour = getPart('hour').padStart(2, '0').replace('24', '00'); // Safety for 24-hour glitches
          const currentMinute = getPart('minute').padStart(2, '0');
          const currentTimeStr = `${currentHour}:${currentMinute}`;

          // Weekday comes from formatter as 'Sun', 'Mon' etc. - We need lowercase 'sun', 'mon'
          const currentDay = getPart('weekday').toLowerCase();

          // Double check if '24' issue pushed day forward incorrectly? 
          // Actually Intl.DateTimeFormat handles day rollover correctly, so the 'weekday' part should be correct for the user's localized time.

          if (!currentDay) {
            console.error(`❌ Error calculating day for User ${userId}. TZ: ${userTz}, RawParts: ${JSON.stringify(parts)}`);
            continue;
          }

          console.log(`👤 User: ${userId} | TZ: ${userTz} | Local: ${currentDay.toUpperCase()} ${currentTimeStr}`);

          // C. Check Projects for this User
          // Helper to normalize time string for comparison (e.g. 09:05 -> 09:05, 9:5 -> 09:05)
          const normalizeTime = (t) => {
            if (!t) return "";
            const parts = String(t).trim().split(':');
            if (parts.length !== 2) return String(t).trim();
            return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
          };

          for (const project of projectsByUser[userId]) {
            // Check Slots (Only for current day)
            // Firestore query inside loop is okay if scale is low, but better to structure slots differently later or read all slots.
            // For now, let's query slots for the current day.
            const slotsRef = project.ref.collection('slots').where('day', '==', currentDay);
            const slotsSnap = await slotsRef.get();

            if (slotsSnap.empty) {
              // console.log(`   [${project.data.name}] No slots found for ${currentDay}`);
              continue;
            }

            console.log(`   📂 [${project.data.name}] found ${slotsSnap.size} slots for ${currentDay}. Checking matches...`);

            for (const slotDoc of slotsSnap.docs) {
              const slot = slotDoc.data();
              const slotStartNormalized = normalizeTime(slot.start);

              // --- DEBUG: LOG EVERYTHING ---
              console.log(`      🔍 Checking Slot: '${slot.start}' | Normalized: '${slotStartNormalized}' | Current: '${currentTimeStr}'`);

              // EXACT MATCH CHECK (Normalized)
              if (slotStartNormalized === currentTimeStr) {
                console.log(`      ✅ MATCH FOUND! Project: ${project.data.name} @ ${slot.start}`);

                // D. IDEMPOTENCY & JOB CREATION
                const jobId = `job_${project.id}_${currentDay}_${slotStartNormalized.replace(':', '')}_${new Date().toISOString().split('T')[0]}`;
                const jobRef = db.collection('agent_jobs').doc(jobId);
                const jobExists = await jobRef.get();

                if (!jobExists.exists) {
                  // Extract scene data from Mode (prefer compiledScenes if available)
                  const variableValues = project.data.variableValues || {};
                  let prompts = []; // Final prompts to use (English)
                  let scenes = []; // Complete scene objects
                  let modeMetadata = {};
                  let episodeData = null; // Episode from Content Queue

                  // === CONTENT QUEUE INTEGRATION using SHARED HELPER ===
                  // Get episode selection mode from project settings (default: sequential)
                  const episodeSelectionMode = project.data.episodeSelection || 'sequential';
                  console.log(`      🎯 Episode selection mode: ${episodeSelectionMode}`);

                  // Use SHARED getNextEpisode helper
                  const episodeResult = await getNextEpisode(project.ref, episodeSelectionMode);

                  if (episodeResult) {
                    episodeData = episodeResult;
                    console.log(`      📺 Episode from Queue: "${episodeData.title}" (mode: ${episodeSelectionMode})`);

                    // Mark episode as processing
                    await episodeResult.ref.update({
                      status: 'processing',
                      processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                  } else {
                    console.log(`      ⚠️ No pending episodes in queue, using Mode defaults`);
                  }

                  const modeId = project.data.executionModeId;
                  if (modeId) {
                    try {
                      const modeDoc = await db.collection('users').doc(userId).collection('modes').doc(modeId).get();
                      if (modeDoc.exists) {
                        const modeData = modeDoc.data();
                        console.log(`      📋 Mode loaded: ${modeData.name}`);

                        // Store Mode-level metadata
                        modeMetadata = {
                          modeName: modeData.name || '',
                          category: modeData.category || '',
                          description: modeData.description || '',
                          systemInstruction: modeData.systemInstruction || '',
                          characters: modeData.characters || []
                        };

                        // PRIORITY 1: Use pre-compiled English scenes (from AI)
                        if (modeData.compiledScenes && modeData.compiledScenes.length > 0) {
                          console.log(`      🤖 Using ${modeData.compiledScenes.length} AI-compiled scenes`);
                          scenes = modeData.compiledScenes;
                          prompts = scenes.map(s => s.englishPrompt);
                        }
                        // PRIORITY 2: Fallback to block titles (rawPrompt removed - Expander handles expansion)
                        else if (modeData.blocks && Array.isArray(modeData.blocks)) {
                          console.log(`      ⚠️ No compiled scenes, using block titles`);
                          modeData.blocks.forEach((block, blockIdx) => {
                            // Use block title as scene prompt (Expander will expand it later)
                            const sceneTitle = block.title || `Scene ${blockIdx + 1}`;
                            prompts.push(sceneTitle);

                            scenes.push({
                              sceneNumber: scenes.length + 1,
                              englishPrompt: sceneTitle,
                              audioDescription: '',
                              cameraMovement: 'wide',
                              dialogueScript: ''
                            });
                          });
                        }
                        console.log(`      🎬 Total ${prompts.length} prompts ready for execution`);
                      }
                    } catch (modeErr) {
                      console.error(`      ❌ Error loading Mode: ${modeErr.message}`);
                    }
                  }

                  // FALLBACK: Legacy prompts support (if no prompts from Mode)
                  if (prompts.length === 0) {
                    if (variableValues.prompts && Array.isArray(variableValues.prompts)) {
                      prompts = variableValues.prompts;
                    } else if (variableValues.prompt) {
                      prompts = [variableValues.prompt];
                    }
                  }

                  // === EXPANDER INTEGRATION (Direct Instructions) ===
                  const expanderId = project.data.expanderId;
                  let expandedPromptsResult = [];
                  let titlesAndTags = null;
                  let expanderInstructions = '';
                  let expanderScenesCount = 5;

                  const slotSceneDuration = slot.sceneDuration || 8;
                  console.log(`      ⏱️ Scene Duration from Posting Schedule: ${slotSceneDuration}s`);

                  if (expanderId) {
                    console.log(`      ⚡ Expander detected: ${expanderId}`);
                    try {
                      const expanderDoc = await project.ref.parent.parent.collection('expanders').doc(expanderId).get();
                      if (expanderDoc.exists) {
                        const expanderData = expanderDoc.data();
                        expanderInstructions = expanderData.instructions || '';
                        expanderScenesCount = expanderData.scenesCount || 5;
                        
                        const episodeTopic = episodeData?.title || expanderData.name || 'Video';
                        
                        console.log(`      📋 Using Expander Instructions directly`);
                        console.log(`      📺 Episode Topic: "${episodeTopic}"`);
                        console.log(`      🎬 Scenes Count: ${expanderScenesCount}`);

                        // Use Expander Instructions directly (same logic as testPromptPipeline)
                        const systemPrompt = `You are a Premium Prompt Expander for AI video generation.

=== CUSTOM INSTRUCTIONS ===
${expanderInstructions}

=== SCENE COUNT ===
Generate exactly ${expanderScenesCount} video scenes.

=== OUTPUT FORMAT (JSON) ===
{
  "prompts": [
    { "index": 1, "type": "image", "title": "Master Image", "prompt": "..." },
    { "index": 2, "type": "video", "title": "Scene title", "duration": "${slotSceneDuration} seconds", "action": "...", "script": "...", "technical": "...", "audio": "..." },
    ... ${expanderScenesCount} video scenes ...
    { "index": "last", "type": "social", "title": "Social Media", "description": "...", "hashtags": ["..."] }
  ]
}`;

                        const structuredPrompts = await callGemini(
                          `Expand: "${episodeTopic}"`,
                          systemPrompt
                        );
                        expandedPromptsResult = structuredPrompts.prompts || [];
                        
                        // Extract prompts for video generation
                        prompts = expandedPromptsResult
                          .filter(p => p.type === 'video')
                          .map(p => `${p.action} ${p.script}`);
                        scenes = expandedPromptsResult;

                        // Extract titles and tags from social
                        const socialPrompt = expandedPromptsResult.find(p => p.type === 'social');
                        titlesAndTags = {
                          titles: { tiktok: socialPrompt?.description, facebook: socialPrompt?.description, instagram: socialPrompt?.description, youtube: socialPrompt?.description },
                          tags: { tiktok: socialPrompt?.hashtags || [], facebook: socialPrompt?.hashtags?.slice(0, 3) || [], instagram: socialPrompt?.hashtags || [], youtube: socialPrompt?.hashtags?.slice(0, 10) || [] }
                        };

                        console.log(`      ✅ Expanded ${expandedPromptsResult.length} prompts using Expander Instructions`);
                      }
                    } catch (expandErr) {
                      console.error(`      ⚠️ Expansion error:`, expandErr.message);
                    }
                  }

                  // === SAVE TO readyPrompts/ COLLECTION ===
                  const readyPromptData = {
                    prompts: expandedPromptsResult.length > 0 ? expandedPromptsResult : scenes,
                    titles: titlesAndTags?.titles || null,
                    tags: titlesAndTags?.tags || null,
                    episodeId: episodeData?.id || null,
                    episodeTitle: episodeData?.title || null,
                    modeId: modeId || null,
                    modeName: modeMetadata.modeName || null,
                    expanderId: expanderId || null,
                    status: 'ready',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                  };

                  const readyPromptRef = await project.ref.collection('readyPrompts').add(readyPromptData);
                  console.log(`      📦 Ready prompt saved: ${readyPromptRef.id}`);

                  // === BUILD BLOCK SEQUENCE ===
                  const PLATFORM_TO_UPLOAD_BLOCK = {
                    'facebook': 'UPLOAD_FACEBOOK',
                    'youtube': 'UPLOAD_YOUTUBE',
                    'tiktok': 'UPLOAD_TIKTOK',
                    'instagram': 'UPLOAD_INSTAGRAM'
                  };

                  // สร้าง Block Sequence: ADD_SCENE → EXPORT → DOWNLOAD → UPLOAD(s)
                  const blockSequence = [
                    'ADD_SCENE_TEXT',   // 🔁 LOOP: ทำซ้ำตาม prompts.length
                    'EXPORT_VIDEO',     // ⏺ ONCE: Export วิดีโอ
                    'DOWNLOAD_FILE'     // ⏺ ONCE: Download ไฟล์
                  ];

                  // เพิ่ม Upload Block ตามที่ User เลือกไว้ใน Posting Schedule
                  const slotPlatforms = slot.platforms || [];
                  if (slotPlatforms.length > 0) {
                    slotPlatforms.forEach(p => {
                      const uploadBlock = PLATFORM_TO_UPLOAD_BLOCK[p.platformId];
                      if (uploadBlock) {
                        blockSequence.push(uploadBlock);
                      }
                    });
                  }

                  console.log(`      🧱 Block Sequence: ${blockSequence.join(' → ')}`);

                  // Create Job with Block Sequence
                  await jobRef.set({
                    projectId: project.id,
                    userId: userId,
                    blockSequence: blockSequence,
                    currentBlockIndex: 0,
                    platforms: slotPlatforms,
                    type: 'SCHEDULED',
                    status: 'PENDING',
                    variables: variableValues,
                    modeMetadata: modeMetadata,
                    scenes: scenes,
                    prompts: prompts,
                    titles: titlesAndTags?.titles || null,
                    tags: titlesAndTags?.tags || null,
                    episodeId: episodeData?.id || null,
                    episodeTitle: episodeData?.title || null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    scheduledTime: slot.start
                  });

                  // --- ADDED: Write Log for UI Feedback ---
                  await project.ref.collection('logs').add({
                    message: `System: Scheduled Job created for ${slot.start} (${project.data.executionMode || 'Default'})`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    platform: 'SYSTEM',
                    type: 'info'
                  });

                  // === MOVE EPISODE TO HISTORY & MARK AS USED ===
                  if (episodeData && episodeData.id) {
                    try {
                      const episodeRef = project.ref.collection('episodes').doc(episodeData.id);
                      
                      // 1. Save to episodeHistory/ collection
                      await project.ref.collection('episodeHistory').add({
                        title: episodeData.title || 'Untitled',
                        description: episodeData.description || '',
                        originalOrder: episodeData.order || 0,
                        originalId: episodeData.id,
                        usedAt: admin.firestore.FieldValue.serverTimestamp(),
                        jobId: jobId,
                        readyPromptId: readyPromptRef.id,
                        generatedPrompts: expandedPromptsResult.length > 0 ? expandedPromptsResult : scenes,
                        titles: titlesAndTags?.titles || null,
                        tags: titlesAndTags?.tags || null,
                        wasSuccessful: true
                      });

                      // 2. Mark Episode as used (or delete - we keep it but mark status)
                      await episodeRef.update({
                        status: 'used',
                        usedAt: admin.firestore.FieldValue.serverTimestamp(),
                        jobId: jobId
                      });

                      console.log(`      📚 Episode "${episodeData.title}" moved to history`);

                      // === AUTO-REFILL CHECK ===
                      // Check if episodes are running low and auto-refill is enabled
                      const projectData = project.data;
                      if (projectData.autoRefillEnabled) {
                        const threshold = projectData.autoRefillThreshold || 5;
                        const refillCount = projectData.autoRefillCount || 10;
                        const refillPrompt = projectData.autoRefillPrompt || '';

                        const remainingCount = await getRemainingEpisodeCount(project.ref);
                        console.log(`      📊 Remaining episodes: ${remainingCount} (threshold: ${threshold})`);

                        if (remainingCount < threshold) {
                          console.log(`      ⚠️ Episodes running low! Triggering auto-refill...`);

                          // Get history for context
                          const historySnap = await project.ref.collection('episodeHistory')
                            .orderBy('usedAt', 'desc')
                            .limit(20)
                            .get();
                          
                          const historyContext = historySnap.docs.map(d => ({
                            title: d.data().title,
                            description: d.data().description
                          }));

                          // Trigger auto-generate (async, don't wait)
                          autoGenerateEpisodesInternal({
                            projectRef: project.ref,
                            userId: userId,
                            projectId: project.id,
                            count: refillCount,
                            prompt: refillPrompt,
                            historyContext
                          }).then(result => {
                            if (result.success) {
                              console.log(`      ✅ Auto-refill completed: ${result.count} episodes added`);
                            } else {
                              console.error(`      ❌ Auto-refill failed:`, result.error);
                            }
                          }).catch(err => {
                            console.error(`      ❌ Auto-refill error:`, err.message);
                          });
                        }
                      }
                    } catch (historyErr) {
                      console.error(`      ⚠️ Error moving episode to history:`, historyErr.message);
                    }
                  }

                  console.log(`      🚀 Job Created: ${jobId}`);
                } else {
                  console.log(`      ⚠️ Job already exists: ${jobId}`);
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error processing user ${userId}:`, err);
        }
      }
    } catch (globalErr) {
      console.error("🔥 CRITICAL SCHEDULER ERROR:", globalErr);
    }
  });

// ===== EXPANDER SYSTEM =====

// Function: Expand Prompt with Custom Instructions (Gemini)
// Returns structured JSON with separate prompts for image, video scenes, and social
exports.expandPromptWithInstructions = functions
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    const { simplePrompt, instructions } = data;

    if (!simplePrompt || !instructions) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing simplePrompt or instructions');
    }

    try {
      const systemPrompt = `You are a Premium Prompt Expander for AI video generation (Google Flow / Veo).

Your job is to expand a simple prompt into detailed, cinematic prompts.

=== CUSTOM INSTRUCTIONS (User-defined rules for this Expander) ===
${instructions}

=== OUTPUT RULES ===
1. Write in English (required for Google Flow)
2. For Thai names, include original in parentheses: "Bas (บาส)"
3. Include: character descriptions, emotions, lighting, camera angles, ambient sounds
4. Be cinematic and detailed
5. Follow ALL the custom instructions above strictly

=== CRITICAL: OUTPUT FORMAT (MUST BE VALID JSON) ===
You MUST return a valid JSON object with this exact structure:

{
  "prompts": [
    {
      "index": 1,
      "type": "image",
      "title": "Master Image (ภาพนิ่ง)",
      "prompt": "Full detailed prompt for generating the master image..."
    },
    {
      "index": 2,
      "type": "video",
      "title": "Scene title here",
      "duration": "8 seconds",
      "action": "What happens in this scene",
      "script": "Character dialogue/narration",
      "technical": "Camera angles, effects",
      "audio": "Voice style, sound effects"
    },
    ... more video scenes as needed based on instructions ...
    {
      "index": "last",
      "type": "social",
      "title": "Social Media",
      "description": "Post description",
      "hashtags": ["#hashtag1", "#hashtag2", ...]
    }
  ]
}

RULES:
- First prompt (index 1) is ALWAYS type "image"
- Last prompt is ALWAYS type "social" with hashtags
- Middle prompts are type "video" (number of scenes depends on instructions)
- Return ONLY valid JSON, no markdown, no explanations, no code blocks`;

      const structuredPrompts = await callGemini(
        `Expand this prompt into structured JSON: "${simplePrompt}"`,
        systemPrompt
      );

      if (!structuredPrompts || !structuredPrompts.prompts) {
        return { 
          expandedPrompt: JSON.stringify(structuredPrompts),
          structured: null,
          error: 'Failed to parse structured response'
        };
      }

      // Also return plain text version for backward compatibility
      const plainText = structuredPrompts.prompts?.map((p, i) => {
        if (p.type === 'image') {
          return `[Prompt ${p.index}: ${p.title}]\n${p.prompt}`;
        } else if (p.type === 'video') {
          return `[Prompt ${p.index}: ${p.title} (${p.duration})]\nAction: ${p.action}\nScript: "${p.script}"\nTechnical: ${p.technical}\nAudio: ${p.audio}`;
        } else if (p.type === 'social') {
          return `[Prompt: ${p.title}]\nDescription: ${p.description}\nHashtags: ${p.hashtags?.join(' ') || ''}`;
        }
        return '';
      }).join('\n\n') || rawContent;

      return { 
        expandedPrompt: plainText,
        structured: structuredPrompts
      };
    } catch (error) {
      console.error('Error expanding prompt with instructions:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// Function: Generate Custom Block via AI Chat (Gemini)
exports.generateBlock = functions
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 30 })
  .https.onCall(async (data, context) => {
    const { message } = data;

    if (!message) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing message');
    }

    try {
      const systemPrompt = `You are a Block Generator for a Prompt Expander system.

User will describe what kind of "block" they want. A block is a rule/instruction that modifies how prompts are expanded.

=== YOUR JOB ===
1. Understand what the user wants
2. Generate a block with:
   - name: Short name with emoji (Thai, max 20 chars)
   - type: One of: language, style, lighting, audio, camera, emotion, custom
   - instruction: Clear instruction in English (this will be sent to AI)
   - color: Tailwind color class (bg-red-500, bg-blue-500, etc.)

=== OUTPUT FORMAT (JSON ONLY) ===
{
  "name": "🏛️ โบราณ",
  "type": "style",
  "instruction": "Use ancient/classical speech patterns. Characters speak formally with traditional expressions.",
  "color": "bg-amber-600"
}

Return JSON only, no explanation.`;

      const block = await callGemini(message, systemPrompt);
      return block;
    } catch (error) {
      console.error('Error generating block:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// Function: Translate Block Instruction to Thai (Gemini)
exports.translateBlockToThai = functions
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 30 })
  .https.onCall(async (data, context) => {
    const { blockName, instruction } = data;

    if (!blockName || !instruction) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing blockName or instruction');
    }

    try {
      const systemPrompt = `คุณเป็นผู้ช่วยอธิบาย Block ให้ผู้ใช้เข้าใจ พูดแบบเป็นกันเอง

=== รูปแบบการตอบ ===
- เริ่มต้นด้วย "สวัสดีครับ" หรือ "เฮ้ครับ"
- แนะนำชื่อ Block ก่อน
- อธิบายว่ามันทำอะไรได้แบบภาษาง่ายๆ
- จบด้วยคำชวนใช้งาน
- ความยาว 3-4 ประโยค
- ห้ามใช้ภาษาอังกฤษ

ตอบเป็นข้อความภาษาไทยเท่านั้น ในรูปแบบ JSON: {"thaiDescription": "..."}`;

      const result = await callGemini(
        `Block: "${blockName}"\nInstruction: "${instruction}"`,
        systemPrompt
      );

      return { thaiDescription: result.thaiDescription || result };
    } catch (error) {
      console.error('Error translating block:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ============================================
// CONTENT PIPELINE FUNCTIONS
// ============================================

// Function: Generate Episodes from Topic (AI Episode Director) - Gemini
exports.generateEpisodes = functions
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 60, memory: '512MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { prompt } = data;
    if (!prompt) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing prompt');
    }

    try {
      const systemPrompt = `You are an AI Episode Director. Create an episode list for video content.
            
Rules:
- Generate 5-15 episodes based on the user's topic
- Each episode should have a clear, engaging title
- Include a brief description (1-2 sentences)
- Make episodes progressive (build on each other)
- Titles should be catchy and YouTube-friendly

Output JSON format:
{
  "episodes": [
    { "title": "Episode Title", "description": "Brief description" },
    ...
  ]
}`;

      const result = await callGemini(prompt, systemPrompt);
      return { episodes: result.episodes };
    } catch (error) {
      console.error('Error generating episodes:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ============================================
// TEST PROMPT PIPELINE
// ============================================

// Function: Test full prompt pipeline (Expander-based → Full Prompts + Titles + Tags)
// MODE SYSTEM REMOVED - Now uses Expander's scenesCount and instructions
exports.testPromptPipeline = functions
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const userId = context.auth.uid;
    const { projectId, sceneDuration: inputSceneDuration } = data;

    if (!projectId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing projectId');
    }

    try {
      const db = admin.firestore();

      // 1. Get Project
      const projectDoc = await db
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .get();

      if (!projectDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Project not found');
      }
      const project = projectDoc.data();

      // 1.5. Get sceneDuration from slots or use input/default
      let sceneDuration = inputSceneDuration || 8; // default 8 seconds
      const slotsSnap = await db
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('slots').limit(1).get();

      if (!slotsSnap.empty) {
        const slotData = slotsSnap.docs[0].data();
        sceneDuration = slotData.sceneDuration || sceneDuration;
      }
      console.log(`📏 Scene Duration: ${sceneDuration} seconds`);

      // 2. Get Expander (REQUIRED - Mode System removed)
      const expanderId = project.expanderId;
      if (!expanderId) {
        throw new functions.https.HttpsError('failed-precondition', 'No Expander selected for this project');
      }

      const expanderDoc = await db
        .collection('users').doc(userId)
        .collection('expanders').doc(expanderId)
        .get();

      if (!expanderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Expander not found');
      }
      const expanderData = expanderDoc.data();
      const expanderBlocks = expanderData.blocks || [];
      const expanderInstructions = expanderData.instructions || '';
      const expanderScenesCount = expanderData.scenesCount || 5;

      // 3. Get Episode from Content Queue using SHARED HELPER
      const episodeSelectionMode = project.episodeSelection || 'sequential';
      const projectRef = db.collection('users').doc(userId).collection('projects').doc(projectId);
      
      const episodeData = await getNextEpisode(projectRef, episodeSelectionMode);

      if (episodeData) {
        console.log(`📺 Episode Topic: "${episodeData.title}" (mode: ${episodeSelectionMode})`);
      } else {
        console.log(`⚠️ No pending episodes, using Expander name as topic`);
      }

      // Build Episode context
      const episodeTopic = episodeData?.title || expanderData.name || 'Untitled Video';
      const episodeDesc = episodeData?.description || expanderData.description || '';

      console.log(`📋 testPromptPipeline: Using Expander Instructions directly`);
      console.log(`   Episode Topic: "${episodeTopic}"`);
      console.log(`   Scenes Count: ${expanderScenesCount}`);
      console.log(`   Expander Instructions: ${expanderInstructions ? expanderInstructions.substring(0, 100) + '...' : 'NONE'}`);

      // 4. Use Expander Instructions directly (same logic as expandPromptWithInstructions)
      const systemPrompt = `You are a Premium Prompt Expander for AI video generation (Google Flow / Veo).

Your job is to expand a simple prompt into detailed, cinematic prompts.

=== CUSTOM INSTRUCTIONS (User-defined rules for this Expander) ===
${expanderInstructions}

=== SCENE COUNT ===
Generate exactly ${expanderScenesCount} video scenes (not counting image and social).

=== OUTPUT RULES ===
1. Write in English (required for Google Flow)
2. For Thai names, include original in parentheses: "Bas (บาส)"
3. Include: character descriptions, emotions, lighting, camera angles, ambient sounds
4. Be cinematic and detailed
5. Follow ALL the custom instructions above strictly

=== CRITICAL: OUTPUT FORMAT (MUST BE VALID JSON) ===
You MUST return a valid JSON object with this exact structure:

{
  "prompts": [
    {
      "index": 1,
      "type": "image",
      "title": "Master Image (ภาพนิ่ง)",
      "prompt": "Full detailed prompt for generating the master image..."
    },
    {
      "index": 2,
      "type": "video",
      "title": "Scene title here",
      "duration": "${sceneDuration} seconds",
      "action": "What happens in this scene",
      "script": "Character dialogue/narration",
      "technical": "Camera angles, effects",
      "audio": "Voice style, sound effects"
    },
    ... ${expanderScenesCount} video scenes total ...
    {
      "index": "last",
      "type": "social",
      "title": "Social Media",
      "description": "Post description",
      "hashtags": ["#hashtag1", "#hashtag2", ...]
    }
  ]
}

RULES:
- First prompt (index 1) is ALWAYS type "image"
- Last prompt is ALWAYS type "social" with hashtags
- Middle prompts are type "video" (exactly ${expanderScenesCount} video scenes)
- Return ONLY valid JSON, no markdown, no explanations, no code blocks`;

      const structuredPrompts = await callGemini(
        `Expand this prompt into structured JSON with ${expanderScenesCount} video scenes: "${episodeTopic}"`,
        systemPrompt
      );

      // Convert to expandedPrompts format for compatibility
      const expandedPrompts = structuredPrompts.prompts || [];

      // 5. Extract titles and tags from structured response
      const socialPrompt = expandedPrompts.find(p => p.type === 'social');
      const titlesAndTags = {
        titles: {
          tiktok: socialPrompt?.description || episodeTopic,
          facebook: socialPrompt?.description || episodeTopic,
          instagram: socialPrompt?.description || episodeTopic,
          youtube: socialPrompt?.description || episodeTopic
        },
        tags: {
          tiktok: socialPrompt?.hashtags || [],
          facebook: socialPrompt?.hashtags?.slice(0, 3) || [],
          instagram: socialPrompt?.hashtags || [],
          youtube: socialPrompt?.hashtags?.slice(0, 10) || []
        }
      };

      // 7. Combine results
      const result = {
        prompts: expandedPrompts,
        titles: titlesAndTags.titles,
        tags: titlesAndTags.tags
      };

      // 7. Save Test Result to testLogs/ collection (separate from Project, with TTL)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // TTL: 7 days

      const testLogData = {
        prompts: result.prompts,
        titles: result.titles,
        tags: result.tags,
        episodeId: episodeData?.id || null,
        episodeTitle: episodeData?.title || null,
        expanderId: expanderId,
        expanderName: expanderData.name || 'Unknown',
        expanderBlockCount: expanderBlocks.length,
        sceneCount: expanderScenesCount,
        sceneDuration: sceneDuration,
        totalDuration: expanderScenesCount * sceneDuration,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt) // TTL field for cleanup
      };

      // Save to testLogs/ subcollection
      const testLogRef = await db
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('testLogs')
        .add(testLogData);

      console.log(`📝 Test log saved: ${testLogRef.id} (expires: ${expiresAt.toISOString()})`);

      // Also update lastPromptTest on Project for quick access
      await db
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .update({
          lastPromptTest: {
            ...result,
            testLogId: testLogRef.id,
            testedAt: admin.firestore.FieldValue.serverTimestamp(),
            expanderId: expanderId,
            expanderName: expanderData.name || 'Unknown',
            sceneCount: expanderScenesCount,
            episodeId: episodeData?.id || null,
            episodeTitle: episodeData?.title || null
          }
        });

      // 8. Log the test with detailed info
      await db
        .collection('users').doc(userId)
        .collection('projects').doc(projectId)
        .collection('logs').add({
          message: `✅ Prompt Test: "${episodeTopic}" - Generated ${result.prompts?.length || 0} prompts`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          platform: 'SYSTEM',
          type: 'test',
          testLogId: testLogRef.id,
          sceneCount: expanderScenesCount,
          sceneDuration: sceneDuration,
          totalLength: expanderScenesCount * sceneDuration,
          topic: episodeTopic,
          expanderId: expanderId,
          expanderName: expanderData.name || 'Unknown'
        });

      console.log(`✅ Test Pipeline completed: ${result.prompts?.length || 0} prompts for project ${projectId}`);

      return {
        success: true,
        ...result,
        expanderName: expanderData.name,
        expanderInfo: {
          id: expanderId,
          name: expanderData.name,
          blockCount: expanderBlocks.length,
          sceneCount: expanderScenesCount
        }
      };

    } catch (error) {
      console.error('Test Pipeline Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// Function: Text-to-Speech using Google Cloud TTS (Thai voice)
exports.textToSpeechThai = functions
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data, context) => {
    const { text } = data;

    if (!text) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing text');
    }

    try {
      const client = new TextToSpeechClient();

      const request = {
        input: { text: text },
        voice: {
          languageCode: 'th-TH',
          name: 'th-TH-Chirp3-HD-Charon', // Thai male voice - Chirp HD (natural)
          ssmlGender: 'MALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1.0
        }
      };

      const [response] = await client.synthesizeSpeech(request);

      // Return base64 encoded audio
      const audioBase64 = response.audioContent.toString('base64');

      return {
        audioBase64,
        mimeType: 'audio/mpeg'
      };
    } catch (error) {
      console.error('TTS Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ============================================
// AUTO-REFILL SYSTEM
// ============================================

/**
 * Auto-Generate Episodes when queue is running low
 * Called by scheduleJobs or manually via callable
 */
async function autoGenerateEpisodesInternal(params) {
  const { projectRef, userId, projectId, count = 10, prompt = '', historyContext = [] } = params;
  
  const db = admin.firestore();

  // Build context from history
  const historyTitles = historyContext.length > 0
    ? historyContext.map((h, i) => `${i + 1}. ${h.title}`).join('\n')
    : 'No previous episodes';

  const systemPrompt = `You are an AI Episode Director for video content creation.

=== PREVIOUS EPISODES (for context/style) ===
${historyTitles}

=== USER INSTRUCTION ===
${prompt || 'Create engaging video episode topics that follow the established theme/style.'}

=== TASK ===
Generate ${count} NEW episode ideas that:
1. Follow the same theme/style as previous episodes (if any)
2. Are unique and not repetitive
3. Have catchy, engaging titles
4. Include brief descriptions

=== OUTPUT FORMAT (JSON) ===
{
  "episodes": [
    { "title": "Episode Title", "description": "Brief 1-2 sentence description" }
  ]
}`;

  try {
    const result = await callGemini(`Generate ${count} new episodes`, systemPrompt);
    const episodes = result.episodes || [];

    if (episodes.length === 0) {
      console.log(`⚠️ AI returned no episodes`);
      return { success: false, count: 0 };
    }

    // Get last order number
    const lastEpisodeSnap = await projectRef.collection('episodes')
      .orderBy('order', 'desc')
      .limit(1)
      .get();
    
    let lastOrder = 0;
    if (!lastEpisodeSnap.empty) {
      lastOrder = lastEpisodeSnap.docs[0].data().order || 0;
    }

    // Batch write new episodes
    const batch = db.batch();
    episodes.forEach((ep, i) => {
      const ref = projectRef.collection('episodes').doc();
      batch.set(ref, {
        title: ep.title,
        description: ep.description || '',
        order: lastOrder + i + 1,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'auto-refill'
      });
    });

    await batch.commit();

    // Log the auto-generation
    await projectRef.collection('logs').add({
      message: `🤖 Auto-Refill: Generated ${episodes.length} new episodes`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      platform: 'SYSTEM',
      type: 'auto-refill',
      episodeCount: episodes.length
    });

    console.log(`✅ Auto-generated ${episodes.length} new episodes for project ${projectId}`);

    return { success: true, count: episodes.length, episodes };

  } catch (error) {
    console.error('Auto-generate episodes error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CLEANUP FUNCTION: Delete expired testLogs (TTL 7 days)
// Runs daily at 2:00 AM UTC
// ============================================
exports.cleanupExpiredTestLogs = functions.pubsub.schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    
    console.log('🧹 Starting cleanup of expired testLogs...');
    
    try {
      // Get all users
      const usersSnap = await db.collection('users').get();
      let totalDeleted = 0;

      for (const userDoc of usersSnap.docs) {
        const projectsSnap = await userDoc.ref.collection('projects').get();
        
        for (const projectDoc of projectsSnap.docs) {
          // Find expired testLogs
          const expiredLogs = await projectDoc.ref.collection('testLogs')
            .where('expiresAt', '<', now)
            .get();
          
          if (!expiredLogs.empty) {
            const batch = db.batch();
            expiredLogs.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            totalDeleted += expiredLogs.size;
            console.log(`   Deleted ${expiredLogs.size} expired testLogs from project ${projectDoc.id}`);
          }
        }
      }
      
      console.log(`✅ Cleanup complete: Deleted ${totalDeleted} expired testLogs`);
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  });

// ============================================
// CLEANUP FUNCTION: Delete old episodeHistory (older than 7 days)
// WITH BACKUP: Saves to deletedBackups/ before deletion
// Runs daily at 3:00 AM UTC
// ============================================
exports.cleanupOldEpisodeHistory = functions.pubsub.schedule('0 3 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);
    
    console.log('🧹 Starting cleanup of old episodeHistory (>7 days)...');
    
    try {
      const usersSnap = await db.collection('users').get();
      let totalDeleted = 0;
      let totalBackedUp = 0;

      for (const userDoc of usersSnap.docs) {
        const projectsSnap = await userDoc.ref.collection('projects').get();
        
        for (const projectDoc of projectsSnap.docs) {
          const oldHistory = await projectDoc.ref.collection('episodeHistory')
            .where('usedAt', '<', cutoffTimestamp)
            .get();
          
          if (!oldHistory.empty) {
            // BACKUP before delete
            const backupData = oldHistory.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              deletedAt: admin.firestore.FieldValue.serverTimestamp()
            }));
            
            await projectDoc.ref.collection('deletedBackups').add({
              type: 'episodeHistory',
              count: oldHistory.size,
              data: backupData,
              backedUpAt: admin.firestore.FieldValue.serverTimestamp()
            });
            totalBackedUp += oldHistory.size;

            // Delete
            const batch = db.batch();
            oldHistory.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            totalDeleted += oldHistory.size;
            console.log(`   Backed up & deleted ${oldHistory.size} history entries from project ${projectDoc.id}`);
          }
        }
      }
      
      console.log(`✅ History cleanup complete: Backed up ${totalBackedUp}, Deleted ${totalDeleted}`);
    } catch (error) {
      console.error('❌ History cleanup error:', error);
    }
  });

// ============================================
// CLEANUP FUNCTION: Delete old logs (older than 7 days)
// Runs daily at 3:30 AM UTC
// ============================================
exports.cleanupOldLogs = functions.pubsub.schedule('30 3 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);
    
    console.log('🧹 Starting cleanup of old logs (>7 days)...');
    
    try {
      const usersSnap = await db.collection('users').get();
      let totalDeleted = 0;

      for (const userDoc of usersSnap.docs) {
        const projectsSnap = await userDoc.ref.collection('projects').get();
        
        for (const projectDoc of projectsSnap.docs) {
          const oldLogs = await projectDoc.ref.collection('logs')
            .where('timestamp', '<', cutoffTimestamp)
            .get();
          
          if (!oldLogs.empty) {
            const batch = db.batch();
            oldLogs.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            totalDeleted += oldLogs.size;
            console.log(`   Deleted ${oldLogs.size} old logs from project ${projectDoc.id}`);
          }
        }
      }
      
      console.log(`✅ Logs cleanup complete: Deleted ${totalDeleted} old entries`);
    } catch (error) {
      console.error('❌ Logs cleanup error:', error);
    }
  });

// ============================================
// CLEANUP FUNCTION: Delete old readyPrompts (older than 7 days)
// Runs daily at 4:00 AM UTC
// ============================================
exports.cleanupOldReadyPrompts = functions.pubsub.schedule('0 4 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);
    
    console.log('🧹 Starting cleanup of old readyPrompts (>7 days)...');
    
    try {
      const usersSnap = await db.collection('users').get();
      let totalDeleted = 0;

      for (const userDoc of usersSnap.docs) {
        const projectsSnap = await userDoc.ref.collection('projects').get();
        
        for (const projectDoc of projectsSnap.docs) {
          const oldPrompts = await projectDoc.ref.collection('readyPrompts')
            .where('createdAt', '<', cutoffTimestamp)
            .get();
          
          if (!oldPrompts.empty) {
            const batch = db.batch();
            oldPrompts.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            totalDeleted += oldPrompts.size;
            console.log(`   Deleted ${oldPrompts.size} old readyPrompts from project ${projectDoc.id}`);
          }
        }
      }
      
      console.log(`✅ ReadyPrompts cleanup complete: Deleted ${totalDeleted} old entries`);
    } catch (error) {
      console.error('❌ ReadyPrompts cleanup error:', error);
    }
  });

// ============================================
// CLEANUP FUNCTION: Delete old completed jobs (older than 7 days)
// Runs daily at 4:30 AM UTC
// ============================================
exports.cleanupOldJobs = functions.pubsub.schedule('30 4 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);
    
    console.log('🧹 Starting cleanup of old jobs (>7 days)...');
    
    try {
      // Jobs are at root level: jobs/{jobId}
      const oldJobs = await db.collection('jobs')
        .where('createdAt', '<', cutoffTimestamp)
        .get();
      
      if (!oldJobs.empty) {
        let totalDeleted = 0;
        const batchSize = 500;
        const batches = [];
        let currentBatch = db.batch();
        let count = 0;

        oldJobs.docs.forEach(doc => {
          currentBatch.delete(doc.ref);
          count++;
          if (count >= batchSize) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            count = 0;
          }
        });
        if (count > 0) batches.push(currentBatch);

        for (const batch of batches) {
          await batch.commit();
        }
        totalDeleted = oldJobs.size;
        console.log(`✅ Jobs cleanup complete: Deleted ${totalDeleted} old jobs`);
      } else {
        console.log('✅ Jobs cleanup complete: No old jobs to delete');
      }
    } catch (error) {
      console.error('❌ Jobs cleanup error:', error);
    }
  });

// ============================================
// CLEANUP FUNCTION: Delete used episodes (status: 'used', older than 7 days)
// Runs daily at 5:00 AM UTC
// ============================================
exports.cleanupUsedEpisodes = functions.pubsub.schedule('0 5 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);
    
    console.log('🧹 Starting cleanup of used episodes (>7 days)...');
    
    try {
      const usersSnap = await db.collection('users').get();
      let totalDeleted = 0;

      for (const userDoc of usersSnap.docs) {
        const projectsSnap = await userDoc.ref.collection('projects').get();
        
        for (const projectDoc of projectsSnap.docs) {
          const usedEpisodes = await projectDoc.ref.collection('episodes')
            .where('status', '==', 'used')
            .where('usedAt', '<', cutoffTimestamp)
            .get();
          
          if (!usedEpisodes.empty) {
            const batch = db.batch();
            usedEpisodes.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            totalDeleted += usedEpisodes.size;
            console.log(`   Deleted ${usedEpisodes.size} used episodes from project ${projectDoc.id}`);
          }
        }
      }
      
      console.log(`✅ Used episodes cleanup complete: Deleted ${totalDeleted} old entries`);
    } catch (error) {
      console.error('❌ Used episodes cleanup error:', error);
    }
  });

// ============================================
// MANUAL CLEANUP: Callable function for Admin
// Allows manual trigger of cleanup for a specific project
// ============================================
exports.manualCleanup = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const db = admin.firestore();
    const { allProjects, projectId, userId, targets = ['all'] } = data;
    // targets: ['logs', 'testLogs', 'readyPrompts', 'episodeHistory', 'usedEpisodes', 'all']

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);
    const shouldClean = (target) => targets.includes('all') || targets.includes(target);

    // Helper function to cleanup a single project
    const cleanupProject = async (targetUserId, targetProjectId) => {
      const projectRef = db.collection('users').doc(targetUserId).collection('projects').doc(targetProjectId);
      const results = { logs: 0, testLogs: 0, readyPrompts: 0, episodeHistory: 0, usedEpisodes: 0, backedUp: 0 };

      // 1. Cleanup logs
      if (shouldClean('logs')) {
        const oldLogs = await projectRef.collection('logs').where('timestamp', '<', cutoffTimestamp).get();
        if (!oldLogs.empty) {
          const batch = db.batch();
          oldLogs.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          results.logs = oldLogs.size;
        }
      }
      // 2. Cleanup testLogs
      if (shouldClean('testLogs')) {
        const now = admin.firestore.Timestamp.now();
        const expiredLogs = await projectRef.collection('testLogs').where('expiresAt', '<', now).get();
        if (!expiredLogs.empty) {
          const batch = db.batch();
          expiredLogs.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          results.testLogs = expiredLogs.size;
        }
      }
      // 3. Cleanup readyPrompts
      if (shouldClean('readyPrompts')) {
        const oldPrompts = await projectRef.collection('readyPrompts').where('createdAt', '<', cutoffTimestamp).get();
        if (!oldPrompts.empty) {
          const batch = db.batch();
          oldPrompts.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          results.readyPrompts = oldPrompts.size;
        }
      }
      // 4. Cleanup episodeHistory
      if (shouldClean('episodeHistory')) {
        const oldHistory = await projectRef.collection('episodeHistory').where('usedAt', '<', cutoffTimestamp).get();
        if (!oldHistory.empty) {
          const batch = db.batch();
          oldHistory.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          results.episodeHistory = oldHistory.size;
        }
      }
      // 5. Cleanup used episodes
      if (shouldClean('usedEpisodes')) {
        const usedEpisodes = await projectRef.collection('episodes').where('status', '==', 'used').where('usedAt', '<', cutoffTimestamp).get();
        if (!usedEpisodes.empty) {
          const batch = db.batch();
          usedEpisodes.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          results.usedEpisodes = usedEpisodes.size;
        }
      }
      return results;
    };

    try {
      // Mode: All Projects
      if (allProjects && Array.isArray(allProjects)) {
        const totals = { logs: 0, testLogs: 0, readyPrompts: 0, episodeHistory: 0, usedEpisodes: 0, projectsCleaned: 0 };
        for (const proj of allProjects) {
          try {
            const r = await cleanupProject(proj.userId, proj.projectId);
            totals.logs += r.logs;
            totals.testLogs += r.testLogs;
            totals.readyPrompts += r.readyPrompts;
            totals.episodeHistory += r.episodeHistory;
            totals.usedEpisodes += r.usedEpisodes;
            totals.projectsCleaned++;
          } catch (e) { /* skip invalid */ }
        }
        const totalDeleted = totals.logs + totals.testLogs + totals.readyPrompts + totals.episodeHistory + totals.usedEpisodes;
        return { success: true, deleted: totals, message: `ล้างทุกโปรเจค (${totals.projectsCleaned}) เสร็จสิ้น ลบทั้งหมด ${totalDeleted} รายการ` };
      }

      // Mode: Single Project
      const targetUserId = userId || context.auth.uid;
      if (!projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing projectId');
      }
      const projectRef = db.collection('users').doc(targetUserId).collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();
      if (!projectDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Project not found');
      }

      const results = await cleanupProject(targetUserId, projectId);

      // Log the manual cleanup
      await projectRef.collection('logs').add({
        message: `🧹 Manual Cleanup: Deleted ${results.logs + results.testLogs + results.readyPrompts + results.episodeHistory + results.usedEpisodes} items`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        platform: 'SYSTEM',
        type: 'cleanup',
        details: results
      });

      return {
        success: true,
        deleted: results,
        message: `Cleanup completed. Total deleted: ${Object.values(results).reduce((a, b) => a + b, 0)}`
      };

    } catch (error) {
      console.error('Manual cleanup error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ============================================
// STORAGE STATS: Get document counts for Admin Dashboard
// ============================================
exports.getStorageStats = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const db = admin.firestore();
    const { allProjects, projectId, userId } = data;

    // Helper function to get stats for a single project
    const getProjectStats = async (targetUserId, targetProjectId) => {
      const projectRef = db.collection('users').doc(targetUserId).collection('projects').doc(targetProjectId);
      const [episodesSnap, episodeHistorySnap, logsSnap, testLogsSnap, readyPromptsSnap, slotsSnap, deletedBackupsSnap] = await Promise.all([
        projectRef.collection('episodes').get(),
        projectRef.collection('episodeHistory').get(),
        projectRef.collection('logs').get(),
        projectRef.collection('testLogs').get(),
        projectRef.collection('readyPrompts').get(),
        projectRef.collection('slots').get(),
        projectRef.collection('deletedBackups').get()
      ]);

      let pendingEpisodes = 0, usedEpisodes = 0, oldLogs = 0, oldHistory = 0;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      episodesSnap.docs.forEach(doc => {
        if (doc.data().status === 'pending') pendingEpisodes++;
        else if (doc.data().status === 'used') usedEpisodes++;
      });
      logsSnap.docs.forEach(doc => {
        const ts = doc.data().timestamp?.toDate?.();
        if (ts && ts < sevenDaysAgo) oldLogs++;
      });
      episodeHistorySnap.docs.forEach(doc => {
        const ts = doc.data().usedAt?.toDate?.();
        if (ts && ts < sevenDaysAgo) oldHistory++;
      });

      return {
        episodes: { total: episodesSnap.size, pending: pendingEpisodes, used: usedEpisodes },
        episodeHistory: { total: episodeHistorySnap.size, oldItems: oldHistory },
        logs: { total: logsSnap.size, oldItems: oldLogs },
        testLogs: testLogsSnap.size,
        readyPrompts: readyPromptsSnap.size,
        slots: slotsSnap.size,
        deletedBackups: deletedBackupsSnap.size,
        cleanup: { logs: oldLogs, episodeHistory: oldHistory, usedEpisodes }
      };
    };

    try {
      // Mode: All Projects (aggregate stats)
      if (allProjects && Array.isArray(allProjects)) {
        const totals = { episodes: { total: 0, pending: 0, used: 0 }, episodeHistory: { total: 0, oldItems: 0 }, logs: { total: 0, oldItems: 0 }, testLogs: 0, readyPrompts: 0, slots: 0, deletedBackups: 0 };
        const cleanup = { logs: 0, episodeHistory: 0, usedEpisodes: 0 };

        for (const proj of allProjects) {
          try {
            const stats = await getProjectStats(proj.userId, proj.projectId);
            totals.episodes.total += stats.episodes.total;
            totals.episodes.pending += stats.episodes.pending;
            totals.episodes.used += stats.episodes.used;
            totals.episodeHistory.total += stats.episodeHistory.total;
            totals.episodeHistory.oldItems += stats.episodeHistory.oldItems;
            totals.logs.total += stats.logs.total;
            totals.logs.oldItems += stats.logs.oldItems;
            totals.testLogs += stats.testLogs;
            totals.readyPrompts += stats.readyPrompts;
            totals.slots += stats.slots;
            totals.deletedBackups += stats.deletedBackups;
            cleanup.logs += stats.cleanup.logs;
            cleanup.episodeHistory += stats.cleanup.episodeHistory;
            cleanup.usedEpisodes += stats.cleanup.usedEpisodes;
          } catch (e) { /* skip invalid projects */ }
        }
        return { success: true, stats: totals, cleanupEstimate: cleanup, projectCount: allProjects.length };
      }

      // Mode: Single Project
      const targetUserId = userId || context.auth.uid;
      if (!projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing projectId');
      }
      const stats = await getProjectStats(targetUserId, projectId);
      return { success: true, stats, cleanupEstimate: stats.cleanup };

    } catch (error) {
      console.error('Get storage stats error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ============================================
// YOUTUBE OAUTH API
// ============================================

// YouTube OAuth: Start Authorization
exports.youtubeAuthStart = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { accountId, clientId, redirectUri } = data;
  
  if (!accountId || !clientId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing accountId or clientId');
  }

  // Store state for security (accountId + random string)
  const state = Buffer.from(JSON.stringify({
    accountId,
    uid: context.auth.uid,
    timestamp: Date.now()
  })).toString('base64');

  // YouTube OAuth scopes
  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.force-ssl'
  ].join(' ');

  // Build OAuth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${encodeURIComponent(state)}`;

  return { authUrl, state };
});

// YouTube OAuth: Exchange Code for Token
exports.youtubeAuthCallback = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { code, redirectUri } = data;

  if (!code || !redirectUri) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    // Get YouTube credentials from appSettings
    const settingsRef = admin.firestore().collection('appSettings').doc('youtube');
    const settingsSnap = await settingsRef.get();

    if (!settingsSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'YouTube app settings not found. Please contact admin.');
    }

    const settings = settingsSnap.data();
    const clientId = settings.clientId;
    const clientSecret = settings.clientSecret;

    if (!clientId || !clientSecret) {
      throw new functions.https.HttpsError('failed-precondition', 'YouTube credentials not configured. Please contact admin.');
    }

    // Generate new accountId for this connection
    const accountId = admin.firestore().collection('users').doc(context.auth.uid).collection('accounts').doc().id;

    // Exchange code for tokens
    const tokenResponse = await new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString();

      const options = {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error_description || parsed.error || 'Token exchange failed'));
            }
          } catch (e) {
            reject(new Error('Failed to parse token response'));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    // Get channel info
    console.log('🔍 Fetching YouTube channel info...');
    const channelInfo = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: '/youtube/v3/channels?part=snippet,statistics&mine=true',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenResponse.access_token}`
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.log(`📡 YouTube API Response Status: ${res.statusCode}`);
          console.log(`📡 YouTube API Response Body: ${body.substring(0, 500)}`);
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode === 200 && parsed.items?.length > 0) {
              console.log(`✅ Found channel: ${parsed.items[0].snippet?.title}`);
              resolve(parsed.items[0]);
            } else {
              console.log(`⚠️ No channel found or API error: ${parsed.error?.message || 'Unknown'}`);
              resolve(null);
            }
          } catch (e) {
            console.log(`❌ Parse error: ${e.message}`);
            resolve(null);
          }
        });
      });

      req.on('error', (e) => {
        console.log(`❌ Request error: ${e.message}`);
        resolve(null);
      });
      req.end();
    });

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in * 1000));

    // Save account to Firestore
    const accountRef = admin.firestore().doc(`users/${context.auth.uid}/accounts/${accountId}`);
    
    const updateData = {
      platform: 'youtube',
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || null,
      tokenExpiry: tokenExpiry,
      connectionStatus: 'connected',
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add channel info if available
    if (channelInfo) {
      updateData.channelId = channelInfo.id;
      updateData.channelName = channelInfo.snippet?.title;
      updateData.name = channelInfo.snippet?.title || updateData.name;
      updateData.avatar = channelInfo.snippet?.thumbnails?.default?.url;
      updateData.followers = parseInt(channelInfo.statistics?.subscriberCount || 0);
      updateData.videoCount = parseInt(channelInfo.statistics?.videoCount || 0);
      updateData.views = parseInt(channelInfo.statistics?.viewCount || 0);
    }

    await accountRef.set(updateData, { merge: true });

    return {
      success: true,
      channelId: channelInfo?.id,
      channelName: channelInfo?.snippet?.title,
      subscribers: channelInfo?.statistics?.subscriberCount
    };

  } catch (error) {
    console.error('YouTube OAuth callback error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// YouTube: Refresh Access Token
exports.youtubeRefreshToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { accountId } = data;

  try {
    // Get account data
    const accountRef = admin.firestore().doc(`users/${context.auth.uid}/accounts/${accountId}`);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Account not found');
    }

    const account = accountDoc.data();

    if (!account.refreshToken || !account.clientId || !account.clientSecret) {
      throw new functions.https.HttpsError('failed-precondition', 'Missing refresh token or credentials');
    }

    // Refresh token
    const tokenResponse = await new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        refresh_token: account.refreshToken,
        client_id: account.clientId,
        client_secret: account.clientSecret,
        grant_type: 'refresh_token'
      }).toString();

      const options = {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error_description || 'Token refresh failed'));
            }
          } catch (e) {
            reject(new Error('Failed to parse token response'));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    // Update token in Firestore
    const tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in * 1000));

    await accountRef.update({
      accessToken: tokenResponse.access_token,
      tokenExpiry: tokenExpiry,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, expiresIn: tokenResponse.expires_in };

  } catch (error) {
    console.error('Token refresh error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// FACEBOOK OAuth: Exchange Code for Token
// ============================================
exports.facebookAuthCallback = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { code, redirectUri, platform } = data;

  if (!code || !redirectUri) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    // Get Facebook credentials from appSettings
    const settingsRef = admin.firestore().collection('appSettings').doc('facebook');
    const settingsSnap = await settingsRef.get();

    if (!settingsSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Facebook app settings not found. Please contact admin.');
    }

    const settings = settingsSnap.data();
    const clientId = settings.clientId || settings.appId;
    const clientSecret = settings.clientSecret || settings.appSecret;

    if (!clientId || !clientSecret) {
      throw new functions.https.HttpsError('failed-precondition', 'Facebook credentials not configured. Please contact admin.');
    }

    // Generate new accountId for this connection
    const accountId = admin.firestore().collection('users').doc(context.auth.uid).collection('accounts').doc().id;

    console.log('🔑 Exchanging Facebook code for token...');

    // Exchange code for access token
    const tokenResponse = await new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      }).toString();

      const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v18.0/oauth/access_token?${params}`,
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.log(`📡 Facebook Token Response Status: ${res.statusCode}`);
          console.log(`📡 Facebook Token Response: ${body.substring(0, 300)}`);
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode === 200 && parsed.access_token) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error?.message || 'Token exchange failed'));
            }
          } catch (e) {
            reject(new Error('Failed to parse token response'));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });

    console.log('✅ Got Facebook access token');

    // Get user's Facebook Pages
    console.log('🔍 Fetching Facebook Pages...');
    const pagesResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v18.0/me/accounts?fields=id,name,access_token,picture,followers_count,fan_count&access_token=${tokenResponse.access_token}`,
        method: 'GET'
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.log(`📡 Facebook Pages Response Status: ${res.statusCode}`);
          console.log(`📡 Facebook Pages Response: ${body.substring(0, 500)}`);
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error?.message || 'Failed to get pages'));
            }
          } catch (e) {
            reject(new Error('Failed to parse pages response'));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });

    // Use the first page (or handle multiple pages in UI later)
    const page = pagesResponse.data?.[0];
    
    if (!page) {
      throw new functions.https.HttpsError('not-found', 'No Facebook Pages found. Make sure you manage at least one Facebook Page.');
    }

    console.log(`✅ Found Facebook Page: ${page.name} (ID: ${page.id})`);

    // Get page insights (engagement data)
    let pageInsights = { views: 0, comments: 0, shares: 0 };
    try {
      const insightsResponse = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'graph.facebook.com',
          port: 443,
          path: `/v18.0/${page.id}?fields=engagement,posts.limit(10){comments.summary(true),shares}&access_token=${page.access_token}`,
          method: 'GET'
        };

        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (res.statusCode === 200) {
                resolve(parsed);
              } else {
                resolve(null);
              }
            } catch (e) {
              resolve(null);
            }
          });
        });

        req.on('error', () => resolve(null));
        req.end();
      });

      if (insightsResponse?.posts?.data) {
        let totalComments = 0;
        let totalShares = 0;
        insightsResponse.posts.data.forEach(post => {
          totalComments += post.comments?.summary?.total_count || 0;
          totalShares += post.shares?.count || 0;
        });
        pageInsights.comments = totalComments;
        pageInsights.shares = totalShares;
      }
    } catch (e) {
      console.log('⚠️ Could not fetch page insights:', e.message);
    }

    // Calculate token expiry (Facebook tokens typically last 60 days for long-lived)
    const tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in || 5184000) * 1000);

    // Save account to Firestore
    const accountRef = admin.firestore().doc(`users/${context.auth.uid}/accounts/${accountId}`);
    
    const updateData = {
      platform: platform || 'facebook',
      accessToken: page.access_token, // Use page access token for page operations
      userAccessToken: tokenResponse.access_token, // Keep user token for reference
      tokenExpiry: tokenExpiry,
      connectionStatus: 'connected',
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      pageId: page.id,
      name: page.name,
      avatar: page.picture?.data?.url || `https://graph.facebook.com/${page.id}/picture?type=large`,
      followers: page.followers_count || page.fan_count || 0,
      views: pageInsights.views,
      comments: pageInsights.comments,
      shares: pageInsights.shares,
      videoCount: 0
    };

    await accountRef.set(updateData, { merge: true });

    console.log(`✅ Saved Facebook Page account: ${page.name}`);

    return {
      success: true,
      pageId: page.id,
      pageName: page.name,
      followers: page.followers_count || page.fan_count || 0
    };

  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// DATA DELETION CALLBACK: Facebook Data Deletion
// ============================================
const dataDeletionModule = require('./dataDeletion');
exports.dataDeletion = dataDeletionModule.dataDeletion;

// ============================================
// GET APP SETTINGS: Retrieve API Credentials
// ============================================
const getAppSettingsModule = require('./getAppSettings');
exports.getAppSettings = getAppSettingsModule.getAppSettings;
