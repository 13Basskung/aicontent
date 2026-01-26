console.log("▶️ Auto Post Agent: Player Loaded");

// Prevent duplicate injection
if (window.playerInjected) {
    console.log("⚠️ Player already injected.");
} else {
    window.playerInjected = true;

    // --- HELPER: SLEEP ---
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- HELPER: FIND ELEMENT ---
    const findElement = async (selector, timeout = 15000) => {
        const startTime = Date.now();
        let attempts = 0;

        while (Date.now() - startTime < timeout) {
            attempts++;
            let el = null;
            try {
                // 🛠️ CUSTOM SELECTOR HANDLING
                
                // 🎬 SMART POSITION SELECTORS (for dynamic class names like styled-components)
                // Format: $parent_selector:last-child or $parent_selector:nth-child(n)
                if (selector.startsWith('$')) {
                    const selectorWithoutDollar = selector.substring(1);
                    
                    // Preset: $scene:last - เลือกฉากสุดท้ายใน Google Vids
                    if (selectorWithoutDollar === 'scene:last') {
                        // Google Vids scene container - look for scene thumbnails
                        const sceneContainers = document.querySelectorAll('[data-scene-index], [role="listitem"], [class*="scene"], [class*="thumbnail"]');
                        if (sceneContainers.length > 0) {
                            el = sceneContainers[sceneContainers.length - 1];
                            console.log(`🎬 Found last scene (${sceneContainers.length} total)`);
                        }
                        // Fallback: find parent with multiple similar children
                        if (!el) {
                            const allDivs = document.querySelectorAll('div');
                            for (const div of allDivs) {
                                const children = div.children;
                                if (children.length >= 2) {
                                    const firstChild = children[0];
                                    const lastChild = children[children.length - 1];
                                    // Check if children look like scene thumbnails (similar structure)
                                    if (firstChild.tagName === lastChild.tagName && 
                                        firstChild.querySelector('img, video, canvas')) {
                                        el = lastChild;
                                        console.log(`🎬 Found last scene via structure analysis`);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    // Format: $parent_selector:last-child
                    else if (selectorWithoutDollar.includes(':last-child')) {
                        const parentSelector = selectorWithoutDollar.replace(':last-child', '').trim();
                        const parent = document.querySelector(parentSelector);
                        if (parent && parent.lastElementChild) {
                            el = parent.lastElementChild;
                            console.log(`🎯 Found last-child of "${parentSelector}"`);
                        }
                    }
                    // Format: $parent_selector:nth-child(n)
                    else if (selectorWithoutDollar.includes(':nth-child(')) {
                        const match = selectorWithoutDollar.match(/(.+):nth-child\((\d+)\)/);
                        if (match) {
                            const parentSelector = match[1].trim();
                            const childIndex = parseInt(match[2]) - 1; // Convert to 0-indexed
                            const parent = document.querySelector(parentSelector);
                            if (parent && parent.children[childIndex]) {
                                el = parent.children[childIndex];
                                console.log(`🎯 Found nth-child(${childIndex + 1}) of "${parentSelector}"`);
                            }
                        }
                    }
                    // Format: $selector:last (select last matching element)
                    else if (selectorWithoutDollar.includes(':last')) {
                        const baseSelector = selectorWithoutDollar.replace(':last', '').trim();
                        const allMatches = document.querySelectorAll(baseSelector);
                        if (allMatches.length > 0) {
                            el = allMatches[allMatches.length - 1];
                            console.log(`🎯 Found last of "${baseSelector}" (${allMatches.length} total)`);
                        }
                    }
                    // Format: $selector:nth(n) (select nth matching element)
                    else if (selectorWithoutDollar.includes(':nth(')) {
                        const match = selectorWithoutDollar.match(/(.+):nth\((\d+)\)/);
                        if (match) {
                            const baseSelector = match[1].trim();
                            const index = parseInt(match[2]) - 1; // Convert to 0-indexed
                            const allMatches = document.querySelectorAll(baseSelector);
                            if (allMatches[index]) {
                                el = allMatches[index];
                                console.log(`🎯 Found nth(${index + 1}) of "${baseSelector}"`);
                            }
                        }
                    }
                }
                
                else if (selector.includes('::text=')) {
                    // Format: "tag::text="value""
                    const parts = selector.split('::text=');
                    const tag = parts[0] || '*';
                    let textContent = parts[1];

                    // Remove surrounding quotes if present
                    if ((textContent.startsWith('"') && textContent.endsWith('"')) ||
                        (textContent.startsWith("'") && textContent.endsWith("'"))) {
                        textContent = textContent.slice(1, -1);
                    }

                    // Handle escaped newlines from JSON (e.g. "add_2\nNew")
                    textContent = textContent.replace(/\\n/g, '\n');

                    // XPath Strategy: Search for tag containing text (normalizing spaces)
                    const xpath = `//${tag}[contains(., "${textContent.split('\n')[0]}") or contains(., '${textContent}')]`;

                    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    el = result.singleNodeValue;

                    // 2nd Attempt: Strict Text Match if loose failed
                    if (!el) {
                        const elements = document.getElementsByTagName(tag);
                        for (let item of elements) {
                            if (item.innerText.includes(textContent)) {
                                el = item;
                                break;
                            }
                        }
                    }

                } else if (selector.includes('text=')) {
                    // Fallback for simple "text="
                    const text = selector.split('text=')[1].replace(/["']/g, '');
                    const xpath = `//*[contains(text(), '${text}')]`;
                    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    el = result.singleNodeValue;
                } else {
                    // Standard CSS Selector
                    el = document.querySelector(selector);
                }

            } catch (e) {
                // ignore
            }

            if (el) {
                console.log(`✅ Found: ${selector}`, el);
                // Highlight for visibility
                el.style.outline = "3px solid #facc15"; // Yellow highlight
                el.style.transition = "all 0.2s";
                setTimeout(() => el.style.outline = "", 1000);
                return el;
            }

            await sleep(500);
        }
        console.warn(`⏱️ Element not found after ${attempts} attempts (${timeout/1000}s): ${selector}`);
        throw new Error(`Element not found after ${timeout/1000}s: ${selector}`);
    };

    // --- HELPER: UPLOAD FILE ---
    const uploadFile = async (element) => {
        console.log("📤 Attempting File Upload...");
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "FETCH_ASSET" }, async (response) => {
                if (!response || response.error) {
                    console.error("❌ Asset Fetch Failed:", response?.error);
                    alert("⚠️ Auto Post Agent: Could not fetch asset for upload.");
                    resolve(false);
                    return;
                }

                try {
                    // 1. Convert DataURI to File
                    const res = await fetch(response.dataUri);
                    const blob = await res.blob();
                    const file = new File([blob], response.filename, { type: response.mime });

                    // 2. Simulate User Upload via DataTransfer
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    element.files = dataTransfer.files;

                    // 3. Dispatch Events (Critical for React/Vue apps)
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new Event('input', { bubbles: true }));

                    console.log(`✅ Uploaded: ${response.filename}`);
                    resolve(true);

                } catch (e) {
                    console.error("❌ Upload Injection Failed:", e);
                    resolve(false);
                }
            });
        });
    };

    // --- HELPER: WAIT FOR ELEMENT TO APPEAR ---
    const waitForElement = async (selector, timeout = 300000) => {
        console.log(`⏳ Waiting for element to appear: ${selector} (timeout: ${timeout/1000}s)`);
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const el = document.querySelector(selector);
            if (el) {
                console.log(`✅ Element appeared: ${selector}`);
                return true;
            }
            await sleep(1000);
        }
        console.warn(`⏱️ Timeout waiting for element: ${selector}`);
        return false;
    };

    // --- HELPER: WAIT FOR ELEMENT TO DISAPPEAR ---
    const waitForDisappear = async (selector, timeout = 300000) => {
        console.log(`⏳ Waiting for element to disappear: ${selector} (timeout: ${timeout/1000}s)`);
        const startTime = Date.now();
        
        // First, wait for element to appear (loading started)
        let appeared = false;
        while (Date.now() - startTime < 30000) { // 30s to appear
            const el = document.querySelector(selector);
            if (el) {
                appeared = true;
                console.log(`📍 Element found, now waiting for it to disappear...`);
                break;
            }
            await sleep(500);
        }
        
        if (!appeared) {
            console.log(`⚠️ Element never appeared, continuing...`);
            return true; // Continue anyway
        }
        
        // Now wait for it to disappear
        while (Date.now() - startTime < timeout) {
            const el = document.querySelector(selector);
            if (!el) {
                console.log(`✅ Element disappeared: ${selector}`);
                return true;
            }
            await sleep(1000);
        }
        console.warn(`⏱️ Timeout waiting for element to disappear: ${selector}`);
        return false;
    };

    // --- HELPER: COUNT ELEMENTS ---
    const countElements = (selector) => {
        const count = document.querySelectorAll(selector).length;
        console.log(`📊 Count of "${selector}": ${count}`);
        return count;
    };

    // --- EXECUTION ENGINE ---
    const executeStep = async (step, variables = {}) => {
        console.log(`🚀 Executing: ${step.action} on ${step.selector || 'N/A'}`);

        try {
            await sleep(500); // Human-like delay

            // --- SPECIAL ACTIONS (no element needed) ---
            if (step.action === 'wait_for_element') {
                const timeout = step.timeout || 300000;
                return await waitForElement(step.selector, timeout);
            }
            
            if (step.action === 'wait_for_disappear') {
                const timeout = step.timeout || 300000;
                return await waitForDisappear(step.selector, timeout);
            }
            
            if (step.action === 'count_elements') {
                const count = countElements(step.selector);
                // Store count in window for later comparison
                window.__sceneCount = count;
                return true;
            }
            
            if (step.action === 'wait') {
                const duration = step.duration || step.value || 1000;
                console.log(`⏳ Waiting ${duration}ms...`);
                await sleep(duration);
                return true;
            }
            
            // --- LOOP CONTROL (handled at recipe level, just markers here) ---
            if (step.action === 'loop_start') {
                console.log(`🔄 LOOP_START marker - will be handled by recipe executor`);
                // Store loop start position
                window.__loopStartIndex = window.__currentStepIndex || 0;
                return true;
            }
            
            if (step.action === 'loop_end') {
                console.log(`🏁 LOOP_END marker - will be handled by recipe executor`);
                // This signals the recipe executor to loop back if needed
                return { loopEnd: true, loopStartIndex: window.__loopStartIndex || 0 };
            }
            
            // --- INJECT PROMPT (get prompt from current scene data) ---
            if (step.action === 'inject_prompt') {
                console.log(`📝 INJECT_PROMPT - fetching from Firestore context`);
                // The prompt should be passed via variables from recipe executor
                const prompt = variables?.prompt || variables?.currentPrompt || '';
                if (prompt) {
                    console.log(`📝 Prompt to inject: "${prompt.substring(0, 50)}..."`);
                    // Store for next type action to use
                    window.__pendingPrompt = prompt;
                }
                return true;
            }

            // --- WAIT FOR PROGRESS COMPLETE (tracks %, waits for 100% or disappear) ---
            if (step.action === 'wait_for_progress_complete') {
                const progressSelector = step.selector;
                const timeout = step.timeout || 600000; // 10 minutes default
                const startTime = Date.now();
                let lastProgress = '';
                
                console.log(`📊 Waiting for progress to complete: ${progressSelector}`);
                
                while (Date.now() - startTime < timeout) {
                    const el = document.querySelector(progressSelector);
                    
                    if (!el) {
                        console.log(`✅ Progress element disappeared - Video complete!`);
                        return true;
                    }
                    
                    const currentProgress = el.textContent?.trim() || '';
                    if (currentProgress !== lastProgress) {
                        console.log(`📊 Progress: ${currentProgress}`);
                        lastProgress = currentProgress;
                    }
                    
                    // Check if 100%
                    if (currentProgress.includes('100')) {
                        console.log(`✅ Progress reached 100% - Video complete!`);
                        await sleep(2000); // Wait a bit for UI to update
                        return true;
                    }
                    
                    await sleep(2000); // Check every 2 seconds
                }
                
                console.warn(`⏱️ Timeout waiting for progress to complete`);
                return false;
            }

            // --- WAIT FOR ELEMENT AND CLICK (waits for element to appear, then clicks) ---
            if (step.action === 'wait_for_element_and_click') {
                const timeout = step.timeout || 600000; // 10 minutes default
                const startTime = Date.now();
                
                console.log(`⏳ Waiting for element to appear and click: ${step.selector}`);
                
                while (Date.now() - startTime < timeout) {
                    try {
                        const el = document.querySelector(step.selector);
                        if (el) {
                            console.log(`✅ Element found! Clicking...`);
                            el.click();
                            return true;
                        }
                    } catch (e) {
                        // ignore
                    }
                    await sleep(1000);
                }
                
                console.warn(`⏱️ Timeout waiting for element: ${step.selector}`);
                return false;
            }

            // --- STANDARD ACTIONS (need element) ---
            const el = await findElement(step.selector);

            if (step.action === 'click') {
                el.click();
            }
            else if (step.action === 'type' || step.action === 'input') {
                // 🛡️ AUTO-UPLOAD DETECTION
                if (el.type === 'file') {
                    await uploadFile(el);
                } else {
                    let textToType = step.value || "Test Input";

                    // 📝 CHECK FOR PENDING PROMPT FROM inject_prompt ACTION
                    if (textToType === '{{prompt}}' && window.__pendingPrompt) {
                        textToType = window.__pendingPrompt;
                        console.log(`📝 Using pending prompt: "${textToType.substring(0, 50)}..."`);
                        window.__pendingPrompt = null; // Clear after use
                    }

                    // 🧠 VARIABLE INJECTION LOGIC (Enhanced for Multi-Platform)
                    if (typeof textToType === 'string' && textToType.includes('{{')) {
                        console.log(`🧠 Parsing Variables in: "${textToType}"`);
                        Object.keys(variables).forEach(key => {
                            const regex = new RegExp(`{{${key}}}`, 'g');
                            let value = variables[key];
                            // Handle arrays (join with comma)
                            if (Array.isArray(value)) {
                                value = value.join(', ');
                            }
                            // Handle objects (stringify)
                            else if (typeof value === 'object' && value !== null) {
                                value = JSON.stringify(value);
                            }
                            // Handle null/undefined
                            else if (value === null || value === undefined) {
                                value = '';
                            }
                            textToType = textToType.replace(regex, String(value));
                        });
                        console.log(`🧠 Result: "${textToType.substring(0, 100)}..."`);
                    }

                    el.value = textToType;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            return true;
        } catch (e) {
            console.error(`❌ Step Failed:`, e);
            return false;
        }
    };

    // --- HELPER: Show Step Overlay (Yellow Banner) ---
    const showStepOverlay = (info) => {
        // Remove existing overlay
        const existing = document.getElementById('agent-step-overlay');
        if (existing) existing.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'agent-step-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #000;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 999999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideDown 0.3s ease-out;
        `;

        // Add animation style
        if (!document.getElementById('agent-overlay-style')) {
            const style = document.createElement('style');
            style.id = 'agent-overlay-style';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }

        // Content
        const blockInfo = info.blockName ? `[${info.blockIndex + 1}/${info.totalBlocks}] ${info.blockName}` : '';
        overlay.innerHTML = `
            <span style="animation: pulse 1s infinite;">🧪</span>
            <span>ทดสอบ: ${blockInfo}</span>
            <span style="background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 4px;">
                Step ${info.stepIndex + 1}/${info.totalSteps}
            </span>
            <span style="font-weight: normal; font-size: 12px;">${info.action || ''}</span>
        `;

        document.body.appendChild(overlay);

        // Auto-remove after 2 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s';
                setTimeout(() => overlay.remove(), 300);
            }
        }, 2000);
    };

    // --- HELPER: Highlight Element with Yellow Border ---
    const highlightElement = (el) => {
        if (!el) return;
        
        const originalOutline = el.style.outline;
        const originalTransition = el.style.transition;
        
        el.style.outline = '4px solid #fbbf24';
        el.style.transition = 'outline 0.2s ease-out';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            el.style.outline = originalOutline;
            el.style.transition = originalTransition;
        }, 1500);
    };

    // --- LISTENER ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Handle EXECUTE_STEP_WITH_HIGHLIGHT for testing
        if (request.action === "EXECUTE_STEP_WITH_HIGHLIGHT") {
            const step = request.step;
            const variables = request.variables || {}; // 🔥 NOW RECEIVES VARIABLES!
            console.log(`🧪 Test Step ${request.stepIndex + 1}/${request.totalSteps}:`, step);

            // Show overlay banner
            showStepOverlay({
                stepIndex: request.stepIndex,
                totalSteps: request.totalSteps,
                blockName: request.blockName,
                blockIndex: request.blockIndex || 0,
                totalBlocks: request.totalBlocks || 1,
                action: `${step.action} → ${step.selector?.substring(0, 30) || 'N/A'}...`
            });

            (async () => {
                try {
                    // Find and highlight element first
                    if (step.selector) {
                        try {
                            const el = await findElement(step.selector, 5000);
                            highlightElement(el);
                        } catch (e) {
                            console.warn('Element not found for highlight:', step.selector);
                        }
                    }

                    // Execute the step with variables
                    await executeStep(step, variables);
                    sendResponse({ success: true });
                } catch (err) {
                    console.error('Step execution error:', err);
                    sendResponse({ success: false, error: err.message });
                }
            })();

            return true; // Keep channel open for async response
        }

        if (request.action === "EXECUTE_RECIPE") {
            const recipe = request.recipe || {};
            const steps = recipe.steps || [];
            const variables = recipe.variables || {}; // 🧠 Receive Variables
            const loopCount = recipe.loopCount || variables.loopCount || 1; // จำนวนรอบ loop

            console.log("📜 Starting Recipe...", { stepsCount: steps.length, variables, loopCount });

            (async () => {
                let success = true;
                let i = 0;
                let loopStartIndex = -1; // ตำแหน่งเริ่มต้น loop (-1 = ยังไม่เจอ)
                let currentLoop = 0; // loop รอบปัจจุบัน
                const maxLoops = loopCount;

                while (i < steps.length) {
                    const step = steps[i];
                    window.__currentStepIndex = i;
                    
                    console.log(`📍 Step ${i + 1}/${steps.length}: ${step.action}`);

                    // 🔄 LOOP_START: บันทึกตำแหน่งเริ่มต้น loop
                    if (step.action === 'loop_start') {
                        loopStartIndex = i;
                        currentLoop = 0;
                        console.log(`🔄 LOOP_START at Step ${i + 1} - Will loop ${maxLoops} times`);
                        i++;
                        continue;
                    }

                    // 🏁 LOOP_END: ตรวจสอบว่าต้อง loop ต่อหรือไม่
                    if (step.action === 'loop_end') {
                        currentLoop++;
                        console.log(`🏁 LOOP_END - Completed loop ${currentLoop}/${maxLoops}`);
                        
                        if (currentLoop < maxLoops && loopStartIndex >= 0) {
                            // ยังไม่ครบ → กลับไปที่ step หลัง loop_start
                            console.log(`🔁 Looping back to Step ${loopStartIndex + 2}`);
                            i = loopStartIndex + 1;
                            
                            // อัปเดต prompt สำหรับ loop รอบถัดไป
                            if (variables.prompts && variables.prompts[currentLoop]) {
                                variables.prompt = variables.prompts[currentLoop];
                                variables.currentPrompt = variables.prompts[currentLoop];
                                console.log(`📝 Updated prompt for loop ${currentLoop + 1}: "${variables.prompt?.substring(0, 30)}..."`);
                            }
                            continue;
                        } else {
                            // ครบแล้ว → ไปต่อ step ถัดไป
                            console.log(`✅ All ${maxLoops} loops completed!`);
                            i++;
                            continue;
                        }
                    }

                    // Execute step ปกติ
                    const result = await executeStep(step, variables);
                    if (!result) {
                        success = false;
                        break;
                    }
                    
                    await sleep(1000);
                    i++;
                }

                if (success) {
                    console.log("✅ Recipe Complete!");
                    chrome.runtime.sendMessage({
                        action: "RECIPE_STATUS_UPDATE",
                        status: "COMPLETED",
                        recipeId: recipe.id
                    });
                } else {
                    console.warn("⚠️ Recipe Stopped due to error.");
                    chrome.runtime.sendMessage({
                        action: "RECIPE_STATUS_UPDATE",
                        status: "FAILED",
                        recipeId: recipe.id,
                        error: "Step Execution Failed"
                    });
                }
            })();

            sendResponse({ status: "STARTED" });
        }
    });
}
