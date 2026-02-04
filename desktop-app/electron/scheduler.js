/**
 * Scheduler - Auto-run automation based on Posting Schedule
 * Phase 8: Desktop App
 */

const https = require('https');

const API_KEY = 'AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE';

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
 * Checks: day, time, project status, and expander
 */
function shouldRunNow(slot) {
  const now = new Date();
  const currentDay = getDayCode(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // Check if it's the right day and time
  if (slot.day !== currentDay || slot.start !== currentTime) {
    return false;
  }
  
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
 */
function startScheduler(userId, instances) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  
  console.log('🕐 Scheduler started for user:', userId);
  
  // Check every minute
  schedulerInterval = setInterval(async () => {
    try {
      const schedules = await fetchUserSchedule(userId);
      const now = new Date();
      
      // Collect all slots that should run now
      const slotsToRun = schedules.filter(slot => shouldRunNow(slot));
      
      if (slotsToRun.length > 0) {
        console.log(`⏰ ${slotsToRun.length} slot(s) ready to run`);
        
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
          
          // Execute in parallel
          return executeScheduledRun(slot, instances);
        });
        
        // Wait for all to complete (but they run in parallel)
        await Promise.allSettled(runPromises);
      }
    } catch (error) {
      console.error('Scheduler check error:', error);
    }
  }, 60000); // Check every minute
  
  // Also do initial check
  checkScheduleNow(userId, instances);
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
 */
async function executeScheduledRun(slot, instances) {
  try {
    // Find or create instance for this project
    let instance = instances.find(i => i.projectId === slot.projectId);
    
    if (!instance && instanceManager) {
      // Create new instance for this project
      console.log(`🚀 Creating new instance for project: ${slot.projectName}`);
      const result = await instanceManager.launchInstance(slot.projectId);
      if (result.success) {
        instance = { id: result.instanceId, projectId: slot.projectId };
        // Wait for Chrome to be ready
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.error(`❌ Failed to create instance: ${result.error}`);
        notifyUI('error', slot, result.error);
        return;
      }
    }
    
    if (!instance) {
      console.log(`⚠️ No instance available for project: ${slot.projectName}`);
      notifyUI('error', slot, 'No instance available');
      return;
    }
    
    // Find automation block for this project
    // For now, we'll use a default block or the first available
    const block = await getAutomationBlock(slot.projectId);
    
    if (!block) {
      console.log(`⚠️ No automation block found for project: ${slot.projectName}`);
      notifyUI('error', slot, 'No automation block configured');
      return;
    }
    
    // Prepare variables
    const variables = {
      projectId: slot.projectId,
      projectName: slot.projectName,
      platforms: slot.platforms,
      scenes: slot.scenes,
      sceneDuration: slot.sceneDuration,
      sceneIndex: 0
    };
    
    console.log(`▶️ Running block "${block.name}" for ${slot.projectName}`);
    
    // Execute the block
    if (playwrightBridge) {
      const result = await playwrightBridge.runBlock(instance.id, block, variables);
      
      if (result.success) {
        console.log(`✅ Completed: ${slot.projectName}`);
        notifyUI('success', slot);
      } else {
        console.error(`❌ Failed: ${result.error}`);
        notifyUI('error', slot, result.error);
      }
    }
  } catch (error) {
    console.error(`❌ Execute error: ${error.message}`);
    notifyUI('error', slot, error.message);
  }
}

/**
 * Get automation block for project
 */
async function getAutomationBlock(projectId) {
  // Try to get blocks from store or default
  try {
    const Store = require('electron-store');
    const store = new Store();
    const blocks = store.get('blocks', []);
    
    // Find block assigned to this project or use default
    const projectBlock = blocks.find(b => b.projectId === projectId);
    if (projectBlock) return projectBlock;
    
    // Use first available block as fallback
    if (blocks.length > 0) return blocks[0];
    
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
