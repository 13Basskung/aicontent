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

/**
 * Initialize scheduler
 */
function initScheduler(win, runBlockFn) {
  mainWindow = win;
  runBlockCallback = runBlockFn;
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
          
          if (instance && runBlockCallback) {
            // Notify UI
            if (mainWindow) {
              mainWindow.webContents.send('scheduler:trigger', {
                projectName: slot.projectName,
                slotId: slot.slotId,
                time: slot.start
              });
            }
          } else {
            console.log(`⚠️ No instance found for project: ${slot.projectName}`);
          }
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

module.exports = {
  initScheduler,
  startScheduler,
  stopScheduler,
  fetchUserSchedule,
  getTodaySchedule,
  checkScheduleNow
};
