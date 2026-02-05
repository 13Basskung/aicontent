/**
 * Playwright Recorder - Record automation steps
 * Phase 6: Desktop App (Admin Only)
 */

const { chromium } = require('playwright');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let recorderContext = null;

// ✅ FIX: Recorder ใช้ profile แยกจาก Instance (Test Profile)
let RECORDER_PROFILES_DIR = null;

function getRecorderProfilesDir() {
  if (!RECORDER_PROFILES_DIR) {
    RECORDER_PROFILES_DIR = path.join(app.getPath('userData'), 'recorder-profiles');
    console.log(`📁 Recorder profiles directory: ${RECORDER_PROFILES_DIR}`);
    
    if (!fs.existsSync(RECORDER_PROFILES_DIR)) {
      fs.mkdirSync(RECORDER_PROFILES_DIR, { recursive: true });
    }
  }
  return RECORDER_PROFILES_DIR;
}
let recorderPage = null;
let recordedSteps = [];
let isRecording = false;
let mainWindow = null;

/**
 * Initialize recorder
 */
function initRecorder(win) {
  mainWindow = win;
  console.log('✅ Recorder initialized');
}

/**
 * Start recording session
 */
async function startRecording(profileName, startUrl = 'https://www.google.com') {
  try {
    if (isRecording) {
      throw new Error('Recording already in progress');
    }
    
    recordedSteps = [];
    isRecording = true;
    
    // ✅ FIX: ใช้ Test Profile แยกจาก Instance
    const profilePath = path.join(getRecorderProfilesDir(), profileName || 'default');
    console.log(`🎬 Recorder using profile: ${profilePath}`);
    
    // Ensure profile directory exists
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
    
    // ✅ FIX: Launch browser with fullscreen viewport
    recorderContext = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      viewport: null,  // ใช้ขนาดจอจริง
      deviceScaleFactor: undefined,  // ⚠️ REQUIRED: ต้อง undefined เมื่อ viewport: null
      args: [
        '--start-maximized',  // เปิดเต็มจอ
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-sandbox'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    recorderPage = recorderContext.pages()[0] || await recorderContext.newPage();
    
    // Navigate to start URL
    await recorderPage.goto(startUrl);
    
    // Inject recording script
    await injectRecordingScript(recorderPage);
    
    // Listen for recorded events from page
    recorderPage.on('console', async (msg) => {
      const text = msg.text();
      if (text.startsWith('RECORDER:')) {
        const stepData = JSON.parse(text.replace('RECORDER:', ''));
        addStep(stepData);
      }
    });
    
    // Track navigation
    recorderPage.on('framenavigated', async (frame) => {
      if (frame === recorderPage.mainFrame()) {
        const url = frame.url();
        if (url && !url.startsWith('about:')) {
          // Re-inject script after navigation
          setTimeout(() => injectRecordingScript(recorderPage), 500);
        }
      }
    });
    
    console.log('🎬 Recording started');
    sendToUI('recorder:started', { url: startUrl });
    
    return { success: true, message: 'Recording started' };
  } catch (error) {
    console.error('❌ Start recording error:', error);
    isRecording = false;
    return { success: false, message: error.message };
  }
}

/**
 * Inject recording script into page
 */
async function injectRecordingScript(page) {
  try {
    await page.evaluate(() => {
      if (window.__recorderInjected) return;
      window.__recorderInjected = true;
      
      // Generate selector for element
      function getSelector(el) {
        // Try ID first
        if (el.id) return `#${el.id}`;
        
        // Try data-testid
        if (el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`;
        
        // Try aria-label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return `[aria-label="${ariaLabel}"]`;
        
        // Try name attribute
        if (el.name) return `[name="${el.name}"]`;
        
        // Try placeholder
        if (el.placeholder) return `[placeholder="${el.placeholder}"]`;
        
        // Try button/link text
        if (el.tagName === 'BUTTON' || el.tagName === 'A') {
          const text = el.textContent.trim();
          if (text && text.length < 50) {
            return `${el.tagName.toLowerCase()}:has-text("${text}")`;
          }
        }
        
        // Fallback to tag + class
        const tag = el.tagName.toLowerCase();
        const classes = Array.from(el.classList).slice(0, 2).join('.');
        if (classes) return `${tag}.${classes}`;
        
        return tag;
      }
      
      // Record click
      document.addEventListener('click', (e) => {
        const el = e.target;
        const selector = getSelector(el);
        const text = el.textContent?.trim().substring(0, 50);
        
        console.log('RECORDER:' + JSON.stringify({
          action: 'click',
          selector: selector,
          text: text,
          tag: el.tagName.toLowerCase()
        }));
      }, true);
      
      // Record input
      document.addEventListener('input', (e) => {
        const el = e.target;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          const selector = getSelector(el);
          
          // Debounce - only record after 500ms of no typing
          clearTimeout(el.__inputTimeout);
          el.__inputTimeout = setTimeout(() => {
            console.log('RECORDER:' + JSON.stringify({
              action: 'fill',
              selector: selector,
              value: el.value,
              inputType: el.type || 'text'
            }));
          }, 500);
        }
      }, true);
      
      // Record select change
      document.addEventListener('change', (e) => {
        const el = e.target;
        if (el.tagName === 'SELECT') {
          const selector = getSelector(el);
          console.log('RECORDER:' + JSON.stringify({
            action: 'select',
            selector: selector,
            value: el.value
          }));
        }
      }, true);
      
      console.log('🎬 Recorder script injected');
    });
  } catch (error) {
    console.error('Inject script error:', error);
  }
}

/**
 * Add step to recorded list
 */
function addStep(stepData) {
  const step = {
    id: Date.now(),
    ...stepData,
    timestamp: new Date().toISOString()
  };
  
  recordedSteps.push(step);
  console.log('📝 Recorded step:', step.action, step.selector);
  
  sendToUI('recorder:step', step);
}

/**
 * Add custom step manually
 */
function addCustomStep(action, params) {
  const step = {
    id: Date.now(),
    action,
    ...params,
    timestamp: new Date().toISOString()
  };
  
  recordedSteps.push(step);
  sendToUI('recorder:step', step);
  
  return step;
}

/**
 * Stop recording and return steps
 */
async function stopRecording() {
  try {
    isRecording = false;
    
    if (recorderContext) {
      await recorderContext.close();
      recorderContext = null;
      recorderPage = null;
    }
    
    const steps = [...recordedSteps];
    console.log(`🛑 Recording stopped. ${steps.length} steps recorded.`);
    
    sendToUI('recorder:stopped', { steps });
    
    return { success: true, steps };
  } catch (error) {
    console.error('❌ Stop recording error:', error);
    return { success: false, message: error.message, steps: recordedSteps };
  }
}

/**
 * Get current recorded steps
 */
function getRecordedSteps() {
  return recordedSteps;
}

/**
 * Clear recorded steps
 */
function clearSteps() {
  recordedSteps = [];
  sendToUI('recorder:cleared', {});
}

/**
 * Remove a step by index
 */
function removeStep(index) {
  if (index >= 0 && index < recordedSteps.length) {
    recordedSteps.splice(index, 1);
    sendToUI('recorder:steps-updated', { steps: recordedSteps });
  }
}

/**
 * Edit a step
 */
function editStep(index, updates) {
  if (index >= 0 && index < recordedSteps.length) {
    recordedSteps[index] = { ...recordedSteps[index], ...updates };
    sendToUI('recorder:steps-updated', { steps: recordedSteps });
  }
}

/**
 * Send event to UI
 */
function sendToUI(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Check if currently recording
 */
function isCurrentlyRecording() {
  return isRecording;
}

module.exports = {
  initRecorder,
  startRecording,
  stopRecording,
  getRecordedSteps,
  clearSteps,
  removeStep,
  editStep,
  addCustomStep,
  isCurrentlyRecording
};
