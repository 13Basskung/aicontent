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
 */
async function fetchUserTimezone(userId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}?key=${API_KEY}`;
    const data = await fetchJSON(url);
    if (data.fields?.timezone?.stringValue) {
      userTimezone = data.fields.timezone.stringValue;
      console.log('🌍 User timezone:', userTimezone);
    }
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
 * Fetch all slots for a user's projects
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
      
      // Get slots for this project
      const slotsUrl = `https://firestore.googleapis.com/v1/projects/content-auto-post/databases/(default)/documents/users/${userId}/projects/${projectId}/slots?key=${API_KEY}`;
      const slotsData = await fetchJSON(slotsUrl);
      
      for (const slot of slotsData.documents || []) {
        const slotId = slot.name.split('/').pop();
        const fields = slot.fields || {};
        
        schedules.push({
          projectId,
          projectName,
          slotId,
          day: parseFirestoreValue(fields.day),
          start: parseFirestoreValue(fields.start),
          end: parseFirestoreValue(fields.end),
          scenes: parseFirestoreValue(fields.scenes),
          sceneDuration: parseFirestoreValue(fields.sceneDuration),
          platforms: parseFirestoreValue(fields.platforms) || []
        });
      }
    }
    
    return schedules;
  } catch (error) {
    console.error('❌ Failed to fetch schedule:', error);
    return [];
  }
}

/**
 * Check if a slot should run now
 */
function shouldRunNow(slot) {
  const now = new Date();
  const currentDay = getDayCode(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // Check if it's the right day and time (within 1 minute window)
  if (slot.day === currentDay && slot.start === currentTime) {
    return true;
  }
  
  return false;
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
      
      for (const slot of schedules) {
        if (shouldRunNow(slot)) {
          console.log(`⏰ Time to run: ${slot.projectName} at ${slot.start}`);
          
          // Find instance for this project
          const instance = instances.find(i => i.projectId === slot.projectId);
          
          // Notify UI first
          if (mainWindow) {
            mainWindow.webContents.send('scheduler:trigger', {
              projectName: slot.projectName,
              slotId: slot.slotId,
              time: slot.start,
              status: 'starting'
            });
          }
          
          // Auto-run: Launch Chrome and execute block
          await executeScheduledRun(slot, instances);
        }
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

module.exports = {
  initScheduler,
  startScheduler,
  stopScheduler,
  fetchUserSchedule,
  getTodaySchedule,
  checkScheduleNow,
  executeScheduledRun,
  fetchUserTimezone,
  getUserTimezone,
  createScheduleHash,
  hasScheduleChanged
};
