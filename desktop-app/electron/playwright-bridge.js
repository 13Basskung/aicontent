const { ipcMain } = require('electron');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Store active browser instances
const instances = new Map();

// Profile directory
const PROFILES_DIR = path.join(process.cwd(), 'profiles');

// Ensure profiles directory exists
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

/**
 * Initialize Playwright IPC handlers
 */
function initPlaywrightBridge(mainWindow) {
  console.log('🎭 Initializing Playwright Bridge...');

  // ============================================
  // Launch Chrome Instance
  // ============================================
  ipcMain.handle('playwright:launch', async (event, config) => {
    const { instanceId, projectId, projectName } = config;
    
    console.log(`🚀 Launching Chrome instance: ${instanceId}`);
    
    try {
      const profilePath = path.join(PROFILES_DIR, instanceId);
      
      // Ensure profile directory exists
      if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
      }

      // Launch persistent context (keeps login state)
      const browser = await chromium.launchPersistentContext(profilePath, {
        headless: false,  // Must be visible for Google Vids
        viewport: { width: 1280, height: 720 },
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--no-first-run',
          '--no-default-browser-check'
        ],
        ignoreDefaultArgs: ['--enable-automation']
      });

      // Get the first page or create new one
      let page = browser.pages()[0];
      if (!page) {
        page = await browser.newPage();
      }

      // Store instance
      instances.set(instanceId, {
        browser,
        page,
        projectId,
        projectName,
        status: 'running',
        createdAt: Date.now()
      });

      // Listen for page close
      browser.on('close', () => {
        console.log(`🔴 Browser closed: ${instanceId}`);
        instances.delete(instanceId);
        sendStatusUpdate(mainWindow, instanceId, 'closed');
      });

      // Send status update
      sendStatusUpdate(mainWindow, instanceId, 'running');

      console.log(`✅ Chrome instance launched: ${instanceId}`);
      return { success: true, instanceId };

    } catch (error) {
      console.error(`❌ Failed to launch Chrome: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // Close Chrome Instance
  // ============================================
  ipcMain.handle('playwright:close', async (event, instanceId) => {
    console.log(`🔴 Closing Chrome instance: ${instanceId}`);
    
    const instance = instances.get(instanceId);
    if (!instance) {
      return { success: false, error: 'Instance not found' };
    }

    try {
      await instance.browser.close();
      instances.delete(instanceId);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to close Chrome: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // Run Block on Instance
  // ============================================
  ipcMain.handle('playwright:run-block', async (event, { instanceId, block, variables }) => {
    console.log(`▶️ Running block "${block.name}" on instance: ${instanceId}`);
    
    const instance = instances.get(instanceId);
    if (!instance) {
      return { success: false, error: 'Instance not found' };
    }

    try {
      const { page } = instance;
      
      // Navigate to start URL if provided
      if (block.startUrl) {
        console.log(`🌐 Navigating to: ${block.startUrl}`);
        await page.goto(block.startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
      }

      // ตรวจสอบว่ามี Loop หรือไม่
      const steps = block.steps || [];
      const hasLoop = steps.some(s => ['loop_start', 'loop_end'].includes(s.action));
      const prompts = variables.prompts || [];
      
      const results = [];
      
      if (hasLoop && prompts.length > 0) {
        // ============================================
        // LOOP MODE: วนตาม prompts.length
        // ============================================
        console.log(`🔄 Loop mode: ${prompts.length} prompts to process`);
        
        // หา index ของ loop_start และ loop_end
        const loopStartIndex = steps.findIndex(s => s.action === 'loop_start');
        const loopEndIndex = steps.findIndex(s => s.action === 'loop_end');
        
        // Execute steps BEFORE loop_start (once)
        for (let i = 0; i < loopStartIndex; i++) {
          const step = steps[i];
          console.log(`📍 Pre-loop Step ${i + 1}: ${step.action}`);
          sendStatusUpdate(mainWindow, instanceId, 'running', {
            currentStep: i + 1,
            totalSteps: steps.length,
            stepAction: step.action
          });
          const result = await executeStepWithModifiers(page, step, variables);
          results.push(result);
          if (!result.success) {
            console.error(`❌ Pre-loop Step ${i + 1} failed: ${result.error}`);
            sendStatusUpdate(mainWindow, instanceId, 'idle');
            return { success: false, results, error: result.error };
          }
        }
        
        // Execute LOOP steps for each prompt
        for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
          console.log(`🔄 Loop iteration ${promptIndex + 1}/${prompts.length}`);
          
          // อัปเดต variables สำหรับ iteration นี้
          const loopVariables = {
            ...variables,
            prompt: prompts[promptIndex],
            sceneIndex: promptIndex + 1,
            currentPromptIndex: promptIndex,
            totalPrompts: prompts.length
          };
          
          // Execute steps INSIDE loop (between loop_start and loop_end)
          for (let i = loopStartIndex + 1; i < loopEndIndex; i++) {
            const step = steps[i];
            console.log(`📍 Loop[${promptIndex + 1}] Step ${i + 1}: ${step.action}`);
            sendStatusUpdate(mainWindow, instanceId, 'running', {
              currentStep: i + 1,
              totalSteps: steps.length,
              stepAction: step.action,
              loopIteration: promptIndex + 1,
              totalIterations: prompts.length
            });
            
            const result = await executeStepWithModifiers(page, step, loopVariables);
            results.push({ ...result, loopIteration: promptIndex + 1 });
            
            if (!result.success) {
              console.error(`❌ Loop[${promptIndex + 1}] Step ${i + 1} failed: ${result.error}`);
              // ถ้า error ใน loop ให้ข้ามไป prompt ถัดไป (ไม่หยุดทั้งหมด)
              console.log(`⏭️ Skipping to next prompt...`);
              break;
            }
          }
          
          console.log(`✅ Completed prompt ${promptIndex + 1}/${prompts.length}`);
        }
        
        // Execute steps AFTER loop_end (once)
        for (let i = loopEndIndex + 1; i < steps.length; i++) {
          const step = steps[i];
          console.log(`📍 Post-loop Step ${i + 1}: ${step.action}`);
          sendStatusUpdate(mainWindow, instanceId, 'running', {
            currentStep: i + 1,
            totalSteps: steps.length,
            stepAction: step.action
          });
          const result = await executeStepWithModifiers(page, step, variables);
          results.push(result);
          if (!result.success) {
            console.error(`❌ Post-loop Step ${i + 1} failed: ${result.error}`);
            break;
          }
        }
        
      } else {
        // ============================================
        // NORMAL MODE: Execute all steps once
        // ============================================
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          
          // Skip loop markers in normal mode
          if (['loop_start', 'loop_end'].includes(step.action)) {
            results.push({ success: true, action: step.action, skipped: true });
            continue;
          }
          
          console.log(`📍 Step ${i + 1}/${steps.length}: ${step.action}`);
          sendStatusUpdate(mainWindow, instanceId, 'running', {
            currentStep: i + 1,
            totalSteps: steps.length,
            stepAction: step.action
          });

          const result = await executeStepWithModifiers(page, step, variables);
          results.push(result);

          if (!result.success) {
            console.error(`❌ Step ${i + 1} failed: ${result.error}`);
            break;
          }
        }
      }

      sendStatusUpdate(mainWindow, instanceId, 'idle');
      return { success: true, results };

    } catch (error) {
      console.error(`❌ Block execution failed: ${error.message}`);
      sendStatusUpdate(mainWindow, instanceId, 'error', { error: error.message });
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // Get All Instances
  // ============================================
  ipcMain.handle('playwright:get-instances', () => {
    const result = {};
    instances.forEach((instance, id) => {
      result[id] = {
        id,
        projectId: instance.projectId,
        projectName: instance.projectName,
        status: instance.status,
        createdAt: instance.createdAt
      };
    });
    return result;
  });

  // ============================================
  // Navigate to URL
  // ============================================
  ipcMain.handle('playwright:navigate', async (event, { instanceId, url }) => {
    const instance = instances.get(instanceId);
    if (!instance) {
      return { success: false, error: 'Instance not found' };
    }

    try {
      await instance.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Playwright Bridge initialized');
}

/**
 * Highlight element with yellow border before action
 */
async function highlightElement(page, selector, duration = 1500) {
  try {
    await page.evaluate(({ sel, dur }) => {
      const el = document.querySelector(sel);
      if (el) {
        const originalOutline = el.style.outline;
        const originalBackground = el.style.backgroundColor;
        const originalTransition = el.style.transition;
        
        el.style.transition = 'all 0.2s ease';
        el.style.outline = '3px solid #FFD700';
        el.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
        
        setTimeout(() => {
          el.style.outline = originalOutline;
          el.style.backgroundColor = originalBackground;
          el.style.transition = originalTransition;
        }, dur);
      }
    }, { sel: selector, dur: duration });
  } catch (e) {
    // Ignore highlight errors
  }
}

/**
 * Execute a single step
 */
async function executeStep(page, step, variables = {}) {
  try {
    const { action, selector, value } = step;
    
    // Inject variables into value
    let processedValue = value || '';
    if (processedValue.includes('{{')) {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedValue = processedValue.replace(regex, String(variables[key] || ''));
      });
    }

    // Highlight element before action (for click, fill, hover actions)
    if (selector && ['click', 'fill', 'type', 'input', 'hover', 'wait_for_element_and_click', 'inject_prompt'].includes(action)) {
      await highlightElement(page, selector);
      await page.waitForTimeout(300); // Brief pause to see highlight
    }

    // Handle different actions
    switch (action) {
      case 'click':
        await page.click(selector, { timeout: 15000 });
        break;

      case 'fill':
      case 'type':
      case 'input':
        await page.fill(selector, processedValue, { timeout: 15000 });
        break;

      case 'wait':
        const duration = parseInt(value) || 1000;
        await page.waitForTimeout(duration);
        break;

      case 'goto':
        // Navigate to URL
        const targetUrl = processedValue || selector;
        if (targetUrl) {
          console.log(`🌐 Navigating to: ${targetUrl}`);
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
        break;

      case 'wait_for_element':
        await page.waitForSelector(selector, { timeout: 30000 });
        break;

      case 'wait_for_disappear':
        await page.waitForSelector(selector, { state: 'hidden', timeout: 300000 });
        break;

      case 'wait_for_element_and_click':
        await page.waitForSelector(selector, { timeout: 30000 });
        await page.click(selector);
        break;

      case 'count_elements':
        const count = await page.locator(selector).count();
        return { success: true, count };

      case 'press':
        await page.keyboard.press(processedValue || 'Enter');
        break;

      case 'scroll':
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, selector);
        break;

      case 'select':
        await page.selectOption(selector, processedValue);
        break;

      case 'hover':
        await page.hover(selector);
        break;

      case 'screenshot':
        const screenshotPath = processedValue || `screenshot_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath });
        break;

      case 'inject_prompt':
        // Special action - inject prompt into a specific element
        if (selector && processedValue) {
          await page.fill(selector, processedValue, { timeout: 15000 });
        }
        break;

      case 'loop_start':
      case 'loop_end':
        // These are control flow markers, handled by the block runner
        break;

      // ============================================
      // NEW ACTION TYPES v1.6.7
      // ============================================
      
      case 'click_dropdown':
        // คลิกเปิดเมนู (combobox/dropdown)
        await page.click(selector, { timeout: 15000 });
        await page.waitForTimeout(500); // รอให้เมนูเปิด
        break;

      case 'click_text':
        // คลิกจากข้อความ - ไม่ต้องหา selector!
        // value = ข้อความที่เห็นบนปุ่ม เช่น "Text to Video"
        const textToClick = processedValue;
        console.log(`🔍 หาและคลิกข้อความ: "${textToClick}"`);
        await page.getByText(textToClick, { exact: false }).click({ timeout: 15000 });
        break;

      case 'wait_for_element_long':
        // รอให้ปรากฏ (นาน) - timeout 10 นาที
        await page.waitForSelector(selector, { timeout: 600000 });
        break;

      case 'wait_and_click_long':
        // รอให้ปรากฏแล้วคลิก (นาน) - timeout 10 นาที
        await page.waitForSelector(selector, { timeout: 600000 });
        await highlightElement(page, selector);
        await page.waitForTimeout(300);
        await page.click(selector);
        break;

      case 'wait_progress_complete':
        // รอโหลดเสร็จ (ตรวจซีนต์เพิ่ม)
        // selector = progress bar selector
        // value = scene list selector (for counting)
        const sceneSelector = processedValue || '[role="listitem"]';
        const maxWaitTime = 600000; // 10 นาที
        const checkInterval = 2000; // ตรวจทุก 2 วินาที
        const maxRetries = 3;
        
        // นับ Scene ก่อน
        const countBefore = await page.locator(sceneSelector).count();
        console.log(`📊 Scene count before: ${countBefore}`);
        
        let progressCompleted = false;
        let retryCount = 0;
        const startTime = Date.now();
        
        while (!progressCompleted && (Date.now() - startTime) < maxWaitTime) {
          try {
            // ตรวจสอบว่า progress bar ยังมีอยู่ไหม
            const progressExists = await page.locator(selector).count() > 0;
            
            if (!progressExists) {
              // Progress หายไป - ตรวจสอบ Scene เพิ่มหรือไม่
              await page.waitForTimeout(1000); // รอให้ DOM update
              const countAfter = await page.locator(sceneSelector).count();
              console.log(`📊 Scene count after: ${countAfter}`);
              
              if (countAfter > countBefore) {
                // Scene เพิ่ม = สำเร็จ
                console.log(`✅ Progress complete! Scene increased: ${countBefore} → ${countAfter}`);
                progressCompleted = true;
              } else {
                // Scene ไม่เพิ่ม = Error
                retryCount++;
                console.log(`⚠️ Scene not increased. Retry ${retryCount}/${maxRetries}`);
                
                if (retryCount >= maxRetries) {
                  console.log(`❌ Max retries reached. Moving to next step.`);
                  return { success: false, error: `Scene ไม่เพิ่มหลัง ${maxRetries} ครั้ง`, action, retryCount };
                }
                
                // รอแล้วตรวจใหม่
                await page.waitForTimeout(checkInterval);
              }
            } else {
              // Progress ยังทำงานอยู่ - อ่าน % (ถ้ามี)
              try {
                const progressText = await page.locator(selector).textContent();
                console.log(`⏳ Progress: ${progressText}`);
              } catch (e) {
                // ไม่สามารถอ่าน text ได้
              }
              await page.waitForTimeout(checkInterval);
            }
          } catch (e) {
            // Element หายไประหว่างตรวจสอบ
            await page.waitForTimeout(checkInterval);
          }
        }
        
        if (!progressCompleted) {
          return { success: false, error: 'Timeout: รอโหลดเกิน 10 นาที', action };
        }
        break;

      default:
        console.warn(`⚠️ Unknown action: ${action}`);
    }

    // Add small delay between steps for stability
    await page.waitForTimeout(500);
    
    return { success: true, action };

  } catch (error) {
    return { success: false, error: error.message, action: step.action };
  }
}

/**
 * Execute step with Post-Actions (Options)
 * Post-Actions: retry_on_fail, wait_progress, wait_after
 */
async function executeStepWithModifiers(page, step, variables = {}, context = {}) {
  const { modifiers } = step;
  const postActions = modifiers?.postActions || [];
  
  // ============================================
  // MAIN STEP: ทำ Step หลัก
  // ============================================
  let result = await executeStep(page, step, variables);
  let retryCount = 0;
  
  // ============================================
  // POST-ACTIONS: ทำหลัง Step หลัก
  // ============================================
  for (const postAction of postActions.sort((a, b) => (a.order || 0) - (b.order || 0))) {
    try {
      switch (postAction.type) {
        case 'retry_on_fail':
          // ลองใหม่ถ้าล้มเหลว
          const maxRetries = postAction.maxRetries || 3;
          while (!result.success && retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 Option: Retry ${retryCount}/${maxRetries}...`);
            await page.waitForTimeout(1000);
            result = await executeStep(page, step, variables);
          }
          if (retryCount > 0) {
            result.retryCount = retryCount;
          }
          break;
          
        case 'wait_progress':
          // รอ Progress Bar หายไป
          const progressSelector = postAction.selector || '[role="progressbar"]';
          console.log(`📊 Option: Waiting for progress (${progressSelector}) to complete...`);
          try {
            await page.waitForSelector(progressSelector, { state: 'hidden', timeout: 600000 });
            console.log(`✅ Option: Progress completed`);
          } catch (e) {
            console.log(`⚠️ Option: Progress timeout or not found`);
          }
          break;
          
        case 'wait_after':
          // รอหลังทำ
          const waitMs = postAction.duration || 2000;
          console.log(`⏰ Option: Waiting ${waitMs}ms...`);
          await page.waitForTimeout(waitMs);
          break;
          
        default:
          console.warn(`⚠️ Unknown option: ${postAction.type}`);
      }
    } catch (postErr) {
      console.error(`❌ Option ${postAction.type} failed:`, postErr.message);
    }
  }
  
  return result;
}

/**
 * Send status update to renderer
 */
function sendStatusUpdate(mainWindow, instanceId, status, extra = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('playwright:status', {
      instanceId,
      status,
      timestamp: Date.now(),
      ...extra
    });
  }
}

/**
 * Close all instances (for cleanup)
 */
async function closeAllInstances() {
  console.log('🧹 Closing all Chrome instances...');
  for (const [id, instance] of instances) {
    try {
      await instance.browser.close();
    } catch (e) {
      console.warn(`Failed to close instance ${id}:`, e.message);
    }
  }
  instances.clear();
}

module.exports = {
  initPlaywrightBridge,
  closeAllInstances,
  getInstances: () => instances
};
