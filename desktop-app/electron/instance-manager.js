const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Reference to instances from playwright-bridge
let instances = null;
let mainWindow = null;

/**
 * Initialize Instance Manager
 * Handles multiple Chrome instances running in parallel
 */
function initInstanceManager(window, instancesMap) {
  console.log('🎛️ Initializing Instance Manager...');
  mainWindow = window;
  instances = instancesMap;

  // ============================================
  // Run Block on All Instances (Parallel)
  // ============================================
  ipcMain.handle('instance:run-all', async (event, { block, variablesPerInstance }) => {
    console.log(`🚀 Running block "${block.name}" on ${instances.size} instances`);
    
    const results = [];
    const promises = [];

    for (const [instanceId, instance] of instances) {
      const variables = variablesPerInstance[instanceId] || {};
      
      // Run each instance in parallel
      const promise = runBlockOnInstance(instanceId, instance, block, variables)
        .then(result => {
          results.push({ instanceId, ...result });
          sendStatusUpdate(instanceId, result.success ? 'idle' : 'error');
        })
        .catch(error => {
          results.push({ instanceId, success: false, error: error.message });
          sendStatusUpdate(instanceId, 'error', { error: error.message });
        });
      
      promises.push(promise);
    }

    // Wait for all to complete
    await Promise.all(promises);
    
    console.log(`✅ All instances completed. Success: ${results.filter(r => r.success).length}/${results.length}`);
    return { success: true, results };
  });

  // ============================================
  // Get Instance Statistics
  // ============================================
  ipcMain.handle('instance:get-stats', () => {
    const stats = {
      total: instances.size,
      idle: 0,
      executing: 0,
      error: 0
    };

    for (const [id, instance] of instances) {
      if (instance.status === 'idle' || instance.status === 'running') stats.idle++;
      else if (instance.status === 'executing') stats.executing++;
      else if (instance.status === 'error') stats.error++;
    }

    return stats;
  });

  // ============================================
  // Close All Instances
  // ============================================
  ipcMain.handle('instance:close-all', async () => {
    console.log('🔴 Closing all instances...');
    
    const closePromises = [];
    for (const [instanceId, instance] of instances) {
      closePromises.push(
        instance.browser.close()
          .then(() => {
            instances.delete(instanceId);
            sendStatusUpdate(instanceId, 'closed');
          })
          .catch(e => console.warn(`Failed to close ${instanceId}:`, e.message))
      );
    }

    await Promise.all(closePromises);
    return { success: true, closed: closePromises.length };
  });

  // ============================================
  // Batch Create Instances
  // ============================================
  ipcMain.handle('instance:batch-create', async (event, configs) => {
    console.log(`📦 Batch creating ${configs.length} instances...`);
    
    const results = [];
    
    for (const config of configs) {
      try {
        // Use playwright:launch handler
        const result = await ipcMain.emit('playwright:launch', event, config);
        results.push({ ...config, success: true });
      } catch (error) {
        results.push({ ...config, success: false, error: error.message });
      }
    }

    return { success: true, results };
  });

  console.log('✅ Instance Manager initialized');
}

/**
 * Run block on a single instance
 */
async function runBlockOnInstance(instanceId, instance, block, variables) {
  const { page } = instance;
  
  sendStatusUpdate(instanceId, 'executing');

  try {
    // Navigate to start URL if provided
    if (block.startUrl) {
      await page.goto(block.startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
    }

    // Execute steps
    for (let i = 0; i < block.steps.length; i++) {
      const step = block.steps[i];
      await executeStep(page, step, variables);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute a single step (simplified version)
 */
async function executeStep(page, step, variables = {}) {
  const { action, selector, value } = step;
  
  // Inject variables
  let processedValue = value || '';
  if (processedValue.includes('{{')) {
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedValue = processedValue.replace(regex, String(variables[key] || ''));
    });
  }

  switch (action) {
    case 'click':
      await page.click(selector, { timeout: 15000 });
      break;
    case 'type':
    case 'input':
      await page.fill(selector, processedValue, { timeout: 15000 });
      break;
    case 'wait':
      await page.waitForTimeout(parseInt(value) || 1000);
      break;
    case 'wait_for_element':
      await page.waitForSelector(selector, { timeout: 30000 });
      break;
    case 'wait_for_disappear':
      await page.waitForSelector(selector, { state: 'hidden', timeout: 300000 });
      break;
  }

  await page.waitForTimeout(500);
}

/**
 * Send status update to renderer
 */
function sendStatusUpdate(instanceId, status, extra = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('playwright:status', {
      instanceId,
      status,
      timestamp: Date.now(),
      ...extra
    });
  }
}

module.exports = { initInstanceManager };
