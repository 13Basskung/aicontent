/**
 * Scheduler - Auto-run automation based on Posting Schedule
 * Phase 8: Desktop App
 * ✅ v1.6.54: Fixed interval logging and added saveExecutionLog
 */

const https = require('https');

const API_KEY = 'AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE';
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents';

// Store active schedules
let activeSchedules = [];
let schedulerInterval = null;
let mainWindow = null;
let runBlockCallback = null;
let instanceManager = null;
let playwrightBridge = null;
let cachedScheduleHash = null;
let userTimezone = 'Asia/Bangkok';

/**
 * Initialize scheduler
 */
function initScheduler(win, runBlockFn, instMgr, pwBridge) {
  mainWindow = win;
  runBlockCallback = runBlockFn;
  instanceManager = instMgr;
  playwrightBridge = pwBridge;
  console.log('✅ Scheduler initialized');
}

/**
 * Fetch helper
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * POST JSON helper for Firestore queries
 */
function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Parse Firestore value
 */
function parseFirestoreValue(value) {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue) {
    const result = {};
    for (const key in value.mapValue.fields) {
      result[key] = parseFirestoreValue(value.mapValue.fields[key]);
    }
    return result;
  }
  return value;
}

/**
 * Get day code from date
 */
function getDayCode(date) {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
}

/**
 * Fetch ready prompts from Firebase for a project
 * Returns the latest ready prompt with all variables
 */
async function fetchReadyPrompts(userId, projectId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}/projects/${projectId}/readyPrompts?key=${API_KEY}`;
    const data = await fetchJSON(url);
    
    if (!data.documents || data.documents.length === 0) {
      console.log(`⚠️ No readyPrompts found for project: ${projectId}`);
      return null;
    }
    
    // Parse all documents
    const prompts = data.documents.map(doc => {
      const fields = doc.fields || {};
      return {
        id: doc.name.split('/').pop(),
        status: parseFirestoreValue(fields.status),
        prompts: parseFirestoreValue(fields.prompts) || [],
        episodeTopic: parseFirestoreValue(fields.episodeTopic),
        createdAt: parseFirestoreValue(fields.createdAt)
      };
    });
    
    // Find the latest 'ready' prompt
    const readyPrompt = prompts.find(p => p.status === 'ready') || prompts[0];
    
    if (readyPrompt) {
      console.log(`📝 Found readyPrompt: ${readyPrompt.id} with ${readyPrompt.prompts?.length || 0} prompts`);
      return readyPrompt;
    }
    
    return null;
  } catch (error) {
    console.error('❌ fetchReadyPrompts error:', error.message);
    return null;
  }
}

/**
 * Fetch blocks from Firebase for a user
 */
async function fetchBlocksFromFirebase(userId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}/blocks?key=${API_KEY}`;
    const data = await fetchJSON(url);
    
    if (!data.documents || data.documents.length === 0) {
      return [];
    }
    
    return data.documents.map(doc => {
      const fields = doc.fields || {};
      return {
        id: doc.name.split('/').pop(),
        name: parseFirestoreValue(fields.name),
        projectId: parseFirestoreValue(fields.projectId),
        startUrl: parseFirestoreValue(fields.startUrl),
        steps: parseFirestoreValue(fields.steps) || []
      };
    });
  } catch (error) {
    console.error('❌ fetchBlocksFromFirebase error:', error.message);
    return [];
  }
}

/**
 * ✅ NEW: Save execution log to Firebase from scheduler
 * Uses REST API directly since we're in main process
 */
async function saveExecutionLogFromScheduler(userId, logData) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/executionLogs?key=${API_KEY}`;
    
    // Convert to Firestore format
    const toFirestoreValue = (value) => {
      if (value === null || value === undefined) return { nullValue: null };
      if (typeof value === 'string') return { stringValue: value };
      if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
      if (typeof value === 'boolean') return { booleanValue: value };
      if (value instanceof Date) return { timestampValue: value.toISOString() };
      if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
      if (typeof value === 'object') {
        const mapValue = {};
        for (const [k, v] of Object.entries(value)) {
          mapValue[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields: mapValue } };
      }
      return { stringValue: String(value) };
    };
    
    const fields = {
      status: toFirestoreValue(logData.status),
      projectId: toFirestoreValue(logData.projectId || ''),
      projectName: toFirestoreValue(logData.projectName || ''),
      instanceId: toFirestoreValue(logData.instanceId || ''),
      instanceName: toFirestoreValue(logData.instanceName || ''),
      blockId: toFirestoreValue(logData.blockId || ''),
      blockName: toFirestoreValue(logData.blockName || ''),
      startTime: toFirestoreValue(logData.startTime || new Date()),
      endTime: toFirestoreValue(logData.endTime || new Date()),
      duration: toFirestoreValue(logData.duration || 0),
      currentStep: toFirestoreValue(logData.currentStep || 0),
      totalSteps: toFirestoreValue(logData.totalSteps || 0),
      failedStep: toFirestoreValue(logData.failedStep || null),
      error: toFirestoreValue(logData.error || null),
      source: toFirestoreValue('scheduler'), // Mark as from scheduler
      createdAt: toFirestoreValue(new Date())
    };
    
    // Use https POST
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const postData = JSON.stringify({ fields });
      
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Execution log saved to Firebase (from scheduler)');
            resolve({ success: true });
          } else {
            console.error('❌ Failed to save log:', data);
            reject(new Error(data));
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('❌ saveExecutionLogFromScheduler error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch user timezone from Firestore
 * Note: Web App stores timezone in users/{Firebase UID}
 * But Desktop App uses email as userId, so we need to query by email
 */
async function fetchUserTimezone(userId) {
  try {
    // First try direct lookup (if userId is Firebase UID)
    let url = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}?key=${API_KEY}`;
    let data = await fetchJSON(url);
    
    if (data.fields?.timezone?.stringValue) {
      userTimezone = data.fields.timezone.stringValue;
      console.log('🌍 User timezone (direct):', userTimezone);
      return userTimezone;
    }
    
    // If userId is email, query users collection by email field
    if (userId.includes('@')) {
      console.log('🔍 Searching timezone by email:', userId);
      const queryUrl = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents:runQuery?key=${API_KEY}`;
      
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'email' },
              op: 'EQUAL',
              value: { stringValue: userId }
            }
          },
          limit: 1
        }
      };
      
      const queryResult = await postJSON(queryUrl, queryBody);
      
      if (queryResult && queryResult[0]?.document?.fields?.timezone?.stringValue) {
        userTimezone = queryResult[0].document.fields.timezone.stringValue;
        console.log('🌍 User timezone (by email):', userTimezone);
        return userTimezone;
      }
    }
    
    console.log('⚠️ Timezone not found, using default: Asia/Bangkok');
    return userTimezone;
  } catch (error) {
    console.error('❌ Failed to fetch timezone:', error.message);
    return 'Asia/Bangkok';
  }
}

/**
 * Get current timezone
 */
function getUserTimezone() {
  return userTimezone;
}

/**
 * Save user timezone to Firestore (project document)
 */
async function saveUserTimezone(userId, timezone) {
  try {
    // Get first project to save timezone
    const projectsUrl = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}/projects?key=${API_KEY}`;
    const projectsData = await fetchJSON(projectsUrl);
    
    if (projectsData.documents?.length > 0) {
      const projectDoc = projectsData.documents[0];
      const projectPath = projectDoc.name;
      
      // Update project document with timezone
      const updateUrl = `https://firestore.googleapis.com/v1/${projectPath}?updateMask.fieldPaths=timezone&key=${API_KEY}`;
      
      const response = await fetch(updateUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            timezone: { stringValue: timezone }
          }
        })
      });
      
      if (response.ok) {
        userTimezone = timezone;
        console.log('🌍 Timezone saved to Firestore:', timezone);
        return { success: true, timezone };
      }
    }
    
    return { success: false, error: 'No project found' };
  } catch (error) {
    console.error('❌ Failed to save timezone:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create hash from schedules for change detection
 */
function createScheduleHash(schedules) {
  const str = JSON.stringify(schedules.map(s => ({
    projectId: s.projectId,
    slotId: s.slotId,
    day: s.day,
    start: s.start
  })).sort((a, b) => a.slotId.localeCompare(b.slotId)));
  // Simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Check if schedules have changed
 */
function hasScheduleChanged(newHash) {
  if (cachedScheduleHash === null) {
    cachedScheduleHash = newHash;
    return true;
  }
  if (cachedScheduleHash !== newHash) {
    cachedScheduleHash = newHash;
    return true;
  }
  return false;
}

/**
 * Fetch all slots for a user's projects (ALL projects, not just running)
 * The "running" filter is applied at execution time, not display time
 */
async function fetchUserSchedule(userId) {
  try {
    // Get all projects
    const projectsUrl = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}/projects?key=${API_KEY}`;
    const projectsData = await fetchJSON(projectsUrl);
    
    const schedules = [];
    
    for (const doc of projectsData.documents || []) {
      const projectId = doc.name.split('/').pop();
      const projectName = parseFirestoreValue(doc.fields?.name);
      const projectStatus = parseFirestoreValue(doc.fields?.status);
      const projectTimezone = parseFirestoreValue(doc.fields?.timezone);
      const projectExpanderId = parseFirestoreValue(doc.fields?.expanderId);
      
      // Update global timezone if project has one
      if (projectTimezone) {
        userTimezone = projectTimezone;
      }
      
      // Get slots for this project (ALL projects for display)
      const slotsUrl = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}/projects/${projectId}/slots?key=${API_KEY}`;
      const slotsData = await fetchJSON(slotsUrl);
      
      for (const slot of slotsData.documents || []) {
        const slotId = slot.name.split('/').pop();
        const fields = slot.fields || {};
        
        schedules.push({
          projectId,
          projectName,
          projectStatus: projectStatus || 'idle',
          projectExpanderId: projectExpanderId || null,
          slotId,
          day: parseFirestoreValue(fields.day),
          start: parseFirestoreValue(fields.start),
          end: parseFirestoreValue(fields.end),
          scenes: parseFirestoreValue(fields.scenes),
          sceneDuration: parseFirestoreValue(fields.sceneDuration),
          platforms: parseFirestoreValue(fields.platforms) || [],
          timezone: projectTimezone || 'Asia/Bangkok'
        });
      }
    }
    
    console.log(`📅 Fetched ${schedules.length} slots from all projects`);
    return schedules;
  } catch (error) {
    console.error('❌ Failed to fetch schedule:', error);
    return [];
  }
}

/**
 * Check if a slot should run now
 * Checks: day, time (in user's timezone), project status, and expander
 */
function shouldRunNow(slot) {
  // ✅ FIX: Convert current time to user's timezone
  const timezone = slot.timezone || userTimezone || 'Asia/Bangkok';
  const now = new Date();
  
  // Get current day and time in user's timezone
  const options = { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const dayMap = { 'Sun': 'sun', 'Mon': 'mon', 'Tue': 'tue', 'Wed': 'wed', 'Thu': 'thu', 'Fri': 'fri', 'Sat': 'sat' };
  const weekdayPart = parts.find(p => p.type === 'weekday')?.value || '';
  const currentDay = dayMap[weekdayPart] || getDayCode(now);
  
  const hourPart = parts.find(p => p.type === 'hour')?.value || '00';
  const minutePart = parts.find(p => p.type === 'minute')?.value || '00';
  const currentTime = `${hourPart.padStart(2, '0')}:${minutePart.padStart(2, '0')}`;
  
  // Debug logging
  console.log(`🕐 Checking slot: ${slot.projectName} | Slot: ${slot.day} ${slot.start} | Current (${timezone}): ${currentDay} ${currentTime}`);
  
  // Check if it's the right day and time
  if (slot.day !== currentDay || slot.start !== currentTime) {
    return false;
  }
  
  console.log(`✅ TIME MATCH! ${slot.projectName} @ ${slot.start}`);
  
  // ✅ Check if project is running
  if (slot.projectStatus !== 'running') {
    console.log(`⏸️ Skipping ${slot.projectName} - status: ${slot.projectStatus}`);
    return false;
  }
  
  // ✅ Check if project has Expander
  if (!slot.projectExpanderId) {
    console.log(`⏸️ Skipping ${slot.projectName} - no Expander selected`);
    return false;
  }
  
  return true;
}

/**
 * Start scheduler loop
 * ✅ FIX: Pass userId to executeScheduledRun for fetching prompts
 */
function startScheduler(userId, instances) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  
  console.log('\n🕐 ========== SCHEDULER STARTED ==========');
  console.log(`👤 User: ${userId}`);
  console.log(`🌍 Timezone: ${userTimezone}`);
  console.log(`📦 Instances passed: ${instances?.length || 0}`);
  
  // Store userId for use in interval
  const schedulerUserId = userId;
  
  // ✅ FIX: Log every interval check
  let checkCount = 0;
  
  // Check every minute
  schedulerInterval = setInterval(async () => {
    checkCount++;
    const now = new Date();
    console.log(`\n⏱️ [Scheduler Check #${checkCount}] ${now.toLocaleTimeString('th-TH', { timeZone: userTimezone })}`);
    
    try {
      const schedules = await fetchUserSchedule(schedulerUserId);
      console.log(`📅 Found ${schedules.length} total slots`);
      
      // Collect all slots that should run now
      const slotsToRun = schedules.filter(slot => shouldRunNow(slot));
      
      if (slotsToRun.length > 0) {
        console.log(`\n⏰ ========== ${slotsToRun.length} SLOT(S) READY TO RUN ==========`);
        
        // Run all slots in parallel (each has its own browser instance)
        const runPromises = slotsToRun.map(async (slot) => {
          console.log(`🚀 Starting: ${slot.projectName} at ${slot.start}`);
          
          // Notify UI
          if (mainWindow) {
            mainWindow.webContents.send('scheduler:trigger', {
              projectName: slot.projectName,
              slotId: slot.slotId,
              time: slot.start,
              status: 'starting'
            });
          }
          
          // ✅ FIX: Pass userId for fetching prompts
          return executeScheduledRun(slot, instances, schedulerUserId);
        });
        
        // Wait for all to complete (but they run in parallel)
        const results = await Promise.allSettled(runPromises);
        console.log(`📊 Execution results:`, results.map(r => r.status));
      } else {
        console.log(`⏸️ No slots to run at this time`);
      }
    } catch (error) {
      console.error('Scheduler check error:', error);
    }
  }, 60000); // Check every minute
  
  // Also do initial check immediately
  console.log('🔄 Running initial check...');
  checkScheduleNow(schedulerUserId, instances);
}

/**
 * Check schedule immediately
 */
async function checkScheduleNow(userId, instances) {
  const schedules = await fetchUserSchedule(userId);
  
  // Send to UI
  if (mainWindow) {
    mainWindow.webContents.send('scheduler:update', schedules);
  }
  
  return schedules;
}

/**
 * Stop scheduler
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🛑 Scheduler stopped');
  }
}

/**
 * Check if scheduler is currently running
 */
function isSchedulerRunning() {
  return schedulerInterval !== null;
}

/**
 * Get upcoming schedules for today
 */
async function getTodaySchedule(userId) {
  const schedules = await fetchUserSchedule(userId);
  const today = getDayCode(new Date());
  
  return schedules
    .filter(s => s.day === today)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Execute scheduled automation run
 * ✅ FIX: Fetch readyPrompts and pass complete variables
 */
async function executeScheduledRun(slot, instances, userId) {
  try {
    console.log(`\n🎯 ========== EXECUTING SCHEDULED RUN ==========`);
    console.log(`📂 Project: ${slot.projectName} (${slot.projectId})`);
    console.log(`⏰ Time: ${slot.start}`);
    
    // Find or create instance for this project
    let instance = instances.find(i => i.projectId === slot.projectId);
    
    if (!instance && instanceManager) {
      // Create new instance for this project
      console.log(`🚀 Creating new instance for project: ${slot.projectName}`);
      const result = await instanceManager.launchInstance(slot.projectId, slot.projectName);
      if (result.success) {
        instance = { id: result.instanceId, projectId: slot.projectId };
        // Wait for Chrome to be ready
        await new Promise(r => setTimeout(r, 5000));
      } else {
        console.error(`❌ Failed to create instance: ${result.error}`);
        notifyUI('error', slot, result.error);
        return { success: false, error: result.error };
      }
    }
    
    if (!instance) {
      console.log(`⚠️ No instance available for project: ${slot.projectName}`);
      notifyUI('error', slot, 'No instance available');
      return { success: false, error: 'No instance available' };
    }
    
    console.log(`✅ Instance ready: ${instance.id}`);
    
    // ✅ FIX: Fetch readyPrompts from Firebase
    const readyPromptData = await fetchReadyPrompts(userId, slot.projectId);
    
    if (!readyPromptData || !readyPromptData.prompts || readyPromptData.prompts.length === 0) {
      console.log(`⚠️ No ready prompts found for project: ${slot.projectName}`);
      notifyUI('error', slot, 'No ready prompts available - Cloud Function may not have generated them yet');
      return { success: false, error: 'No ready prompts' };
    }
    
    console.log(`📝 Ready prompts loaded: ${readyPromptData.prompts.length} items`);
    
    // ✅ FIX: Get block from Firebase or local store
    const block = await getAutomationBlock(slot.projectId, userId);
    
    if (!block) {
      console.log(`⚠️ No automation block found for project: ${slot.projectName}`);
      notifyUI('error', slot, 'No automation block configured');
      return { success: false, error: 'No automation block' };
    }
    
    console.log(`📦 Block loaded: "${block.name}" with ${block.steps?.length || 0} steps`);
    
    // ✅ FIX: Parse prompts by type (same logic as Dashboard.jsx)
    const allPrompts = readyPromptData.prompts || [];
    const masterImagePrompt = allPrompts.find(p => p.type === 'image');
    const videoPrompts = allPrompts.filter(p => p.type === 'video');
    const socialPrompt = allPrompts.find(p => p.type === 'social');
    
    // Prepare complete variables (matching Dashboard.jsx format)
    const variables = {
      // Basic info
      projectId: slot.projectId,
      projectName: slot.projectName,
      platforms: slot.platforms,
      scenes: slot.scenes,
      sceneDuration: slot.sceneDuration,
      sceneIndex: 0,
      
      // ✅ FIX: Prompts for loop
      prompts: videoPrompts.length > 0 ? videoPrompts : allPrompts,
      prompt: (videoPrompts[0] || allPrompts[0]) || '',
      
      // ✅ FIX: Extra variables (outside loop)
      masterImage: masterImagePrompt?.prompt || '',
      socialDescription: socialPrompt?.description || '',
      hashtags: socialPrompt?.hashtags || [],
      totalScenes: videoPrompts.length || allPrompts.length,
      
      // Episode info
      episodeTopic: readyPromptData.episodeTopic || ''
    };
    
    console.log(`📋 Variables prepared:`, {
      videoPrompts: videoPrompts.length,
      hasMasterImage: !!masterImagePrompt,
      hasSocial: !!socialPrompt,
      totalScenes: variables.totalScenes
    });
    
    console.log(`▶️ Running block "${block.name}" for ${slot.projectName}`);
    
    const startTime = new Date();
    
    // Execute the block
    if (playwrightBridge) {
      const result = await playwrightBridge.runBlock(instance.id, block, variables);
      const endTime = new Date();
      const duration = endTime - startTime;
      
      // ✅ NEW: Save execution log to Firebase
      await saveExecutionLogFromScheduler(userId, {
        status: result.success ? 'success' : 'failed',
        projectId: slot.projectId,
        projectName: slot.projectName,
        instanceId: instance.id,
        instanceName: instance.name || '',
        blockId: block.id || '',
        blockName: block.name || '',
        startTime,
        endTime,
        duration,
        currentStep: result.currentStep || 0,
        totalSteps: block.steps?.length || 0,
        failedStep: result.failedStep || null,
        error: result.error || null
      });
      
      if (result.success) {
        console.log(`✅ Completed: ${slot.projectName} (${Math.round(duration/1000)}s)`);
        notifyUI('success', slot);
        return { success: true };
      } else {
        console.error(`❌ Failed: ${result.error}`);
        notifyUI('error', slot, result.error);
        return { success: false, error: result.error };
      }
    }
    
    // ✅ Save error log when no playwright bridge
    await saveExecutionLogFromScheduler(userId, {
      status: 'failed',
      projectId: slot.projectId,
      projectName: slot.projectName,
      error: 'No playwright bridge available'
    });
    
    return { success: false, error: 'No playwright bridge' };
  } catch (error) {
    console.error(`❌ Execute error: ${error.message}`);
    notifyUI('error', slot, error.message);
    
    // ✅ Save error log on exception
    await saveExecutionLogFromScheduler(userId, {
      status: 'failed',
      projectId: slot.projectId,
      projectName: slot.projectName,
      error: error.message
    });
    
    return { success: false, error: error.message };
  }
}

/**
 * Get automation block for project
 * ✅ FIX: Try Firebase first, then fall back to local store
 */
async function getAutomationBlock(projectId, userId) {
  try {
    // ✅ Try to get blocks from Firebase first
    if (userId) {
      const firebaseBlocks = await fetchBlocksFromFirebase(userId);
      if (firebaseBlocks && firebaseBlocks.length > 0) {
        // Find block assigned to this project
        const projectBlock = firebaseBlocks.find(b => b.projectId === projectId);
        if (projectBlock) {
          console.log(`📦 Block from Firebase: "${projectBlock.name}"`);
          return projectBlock;
        }
        
        // Use first available block as fallback
        console.log(`📦 Using first Firebase block: "${firebaseBlocks[0].name}"`);
        return firebaseBlocks[0];
      }
    }
    
    // Fallback to local electron-store
    const Store = require('electron-store');
    const store = new Store();
    const blocks = store.get('blocks', []);
    
    // Find block assigned to this project or use default
    const projectBlock = blocks.find(b => b.projectId === projectId);
    if (projectBlock) {
      console.log(`📦 Block from local store: "${projectBlock.name}"`);
      return projectBlock;
    }
    
    // Use first available block as fallback
    if (blocks.length > 0) {
      console.log(`📦 Using first local block: "${blocks[0].name}"`);
      return blocks[0];
    }
    
    return null;
  } catch (error) {
    console.error('Get block error:', error);
    return null;
  }
}

/**
 * Notify UI about scheduler status
 */
function notifyUI(status, slot, error = null) {
  if (mainWindow) {
    mainWindow.webContents.send('scheduler:status', {
      status,
      projectName: slot.projectName,
      slotId: slot.slotId,
      time: slot.start,
      error
    });
  }
}

// Save block metadata to Firestore
async function saveBlockToFirestore(userId, blockId, data) {
  try {
    const blockRef = db.collection('users').doc(userId).collection('blocks').doc(blockId);
    await blockRef.set(data, { merge: true });
    console.log(`✅ Block ${blockId} saved to Firestore`);
    return true;
  } catch (error) {
    console.error('Save block to Firestore error:', error);
    throw error;
  }
}

module.exports = {
  initScheduler,
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
  fetchUserSchedule,
  getTodaySchedule,
  checkScheduleNow,
  executeScheduledRun,
  fetchUserTimezone,
  getUserTimezone,
  saveUserTimezone,
  saveBlockToFirestore,
  createScheduleHash,
  hasScheduleChanged
};
