# 📋 Task: Desktop App Implementation (Node.js Version)

> **แผนงานใหม่**: ใช้ Node.js + Playwright JS (ไม่ต้องติดตั้ง Python)
> ลูกค้าติดตั้ง .exe เพียงไฟล์เดียว → ใช้งานได้เลย + Auto-Update

---

## � Implementation Status

| Phase | สถานะ | วันที่เสร็จ |
|-------|--------|------------|
| Phase 1: Project Setup | ✅ เสร็จ | 2026-01-31 |
| Phase 2: Firebase Integration | ✅ เสร็จ (รวมใน Phase 1) | 2026-01-31 |
| Phase 3: Key-based Auth | ✅ เสร็จ (รวมใน Phase 1) | 2026-01-31 |
| Phase 4: Project UI | ✅ เสร็จ (รวมใน Phase 1) | 2026-01-31 |
| Phase 5: Playwright Player | ✅ เสร็จ | 2026-01-31 |
| Phase 6: Playwright Recorder | ✅ เสร็จ | 2026-01-31 |
| Phase 7: Multi-Instance | ✅ เสร็จ | 2026-01-31 |
| Phase 8: Scheduler | ✅ เสร็จ | 2026-01-31 |
| Phase 9: Auto-Update | ✅ Config เสร็จ | 2026-01-31 |
| Phase 10: Build & Release | ✅ เสร็จ | 2026-01-31 |

---

## �� สารบัญ

1. [Phase 1: Project Setup (Electron + React + Playwright JS)](#phase-1-project-setup)
2. [Phase 2: Firebase Integration (JavaScript)](#phase-2-firebase-integration)
3. [Phase 3: Key-based Authentication](#phase-3-key-based-authentication)
4. [Phase 4: Project Management UI](#phase-4-project-management-ui)
5. [Phase 5: Playwright Player (JavaScript)](#phase-5-playwright-player)
6. [Phase 6: Playwright Recorder (Admin)](#phase-6-playwright-recorder-admin)
7. [Phase 7: Multi-Instance Manager](#phase-7-multi-instance-manager)
8. [Phase 8: Scheduler & Auto-Run](#phase-8-scheduler--auto-run)
9. [Phase 9: Auto-Update System](#phase-9-auto-update-system)
10. [Phase 10: Build & Release](#phase-10-build--release)

---

## 🎯 ผลลัพธ์ที่ลูกค้าจะได้

```
✅ ไฟล์ติดตั้ง: ContentAutoPost-Setup-1.0.0.exe (~150MB)
✅ ติดตั้งแล้วได้: Desktop Shortcut + Start Menu
✅ ไม่ต้องติดตั้ง Python หรือรันคำสั่งใดๆ
✅ Auto-Update: กดปุ่มเดียวอัพเดทเป็นเวอร์ชันใหม่
```

---

## Phase 1: Project Setup

### 1.1 โครงสร้างโฟลเดอร์ใหม่

```
desktop-app/
├── electron/                  # Electron main process
│   ├── main.js               # Main entry point
│   ├── preload.js            # Preload script (bridge)
│   ├── updater.js            # Auto-update handler
│   └── playwright-bridge.js  # Playwright IPC handlers
│
├── src/                       # React UI (renderer)
│   ├── components/           # React components
│   │   ├── ProjectList.jsx
│   │   ├── ProjectCard.jsx
│   │   ├── InstanceManager.jsx
│   │   ├── BlockRunner.jsx
│   │   └── UpdateNotification.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   └── Dashboard.jsx
│   ├── hooks/
│   │   └── useFirebase.js
│   ├── utils/
│   │   ├── firebase.js       # Firebase REST API
│   │   └── auth.js           # Key decoder
│   ├── App.jsx
│   └── main.jsx
│
├── automation/                # Playwright (JavaScript)
│   ├── player.js             # Step execution engine
│   ├── recorder.js           # Step recording
│   └── instance-manager.js   # Multi-instance control
│
├── profiles/                  # Chrome profiles (auto-created)
│
├── package.json              # All dependencies
├── electron-builder.yml      # Build config + Auto-update
├── vite.config.js            # Vite config
├── WALKTHROUGH.md
└── TASK.md
```

### 1.2 package.json

```json
{
  "name": "content-auto-post",
  "version": "1.0.0",
  "description": "Desktop Agent for Content Auto Post",
  "main": "electron/main.js",
  "author": "Your Name",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build",
    "electron:build": "npm run build && electron-builder",
    "electron:publish": "npm run build && electron-builder --publish always"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "playwright": "^1.40.0",
    "electron-updater": "^6.1.7",
    "electron-store": "^8.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.10",
    "electron": "^28.1.0",
    "electron-builder": "^24.9.1",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0"
  },
  "build": {
    "appId": "com.contentautopost.desktop",
    "productName": "Content Auto Post",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "automation/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": ["nsis"],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "publish": {
      "provider": "github",
      "owner": "YOUR_GITHUB_USERNAME",
      "repo": "content-auto-post-desktop"
    }
  }
}
```

### 1.3 Task Checklist

- [ ] **1.3.1** สร้างโฟลเดอร์ตาม structure
- [ ] **1.3.2** สร้าง `package.json`
- [ ] **1.3.3** สร้าง `electron/main.js`
- [ ] **1.3.4** สร้าง `electron/preload.js`
- [ ] **1.3.5** สร้าง `vite.config.js`
- [ ] **1.3.6** รัน `npm install`
- [ ] **1.3.7** ทดสอบ `npm run electron:dev`

---

## Phase 2: Firebase Integration (JavaScript)

### 2.1 Firebase REST API Client

📁 **อ้างอิง:** `extension/src/background/index.js` บรรทัด 9-10, 46-81

```javascript
// src/utils/firebase.js

const FIREBASE_PROJECT_ID = 'content-auto-post';
const API_KEY = 'AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE';

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/**
 * Convert Firestore value to JavaScript value
 * อ้างอิง: background/index.js บรรทัด 46-62
 */
function parseValue(val) {
  if (!val) return null;
  if ('mapValue' in val) {
    const fields = val.mapValue.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, parseValue(v)])
    );
  }
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseValue);
  }
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  return val;
}

/**
 * Fetch projects for a user
 * อ้างอิง: UserPanel.jsx บรรทัด 203-234
 */
export async function fetchProjects(userId) {
  const url = `${BASE_URL}/users/${userId}/projects?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.documents) return [];
  
  return data.documents.map(doc => {
    const projectId = doc.name.split('/').pop();
    const fields = doc.fields || {};
    return {
      id: projectId,
      name: parseValue(fields.name) || projectId,
      status: parseValue(fields.status) || 'idle'
    };
  });
}

/**
 * Fetch block by name
 * อ้างอิง: background/index.js บรรทัด 84-134
 */
export async function fetchBlock(blockName) {
  const url = `${BASE_URL}:runQuery?key=${API_KEY}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'global_recipe_blocks' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'name' },
          op: 'EQUAL',
          value: { stringValue: blockName }
        }
      },
      limit: 1
    }
  };
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  
  if (!data[0]?.document) return null;
  
  const doc = data[0].document;
  const fields = doc.fields || {};
  
  return {
    id: doc.name.split('/').pop(),
    name: parseValue(fields.name),
    type: parseValue(fields.type) || 'ONCE',
    startUrl: parseValue(fields.startUrl) || '',
    variables: parseValue(fields.variables) || [],
    steps: parseValue(fields.steps) || []
  };
}

/**
 * Fetch prompts from jobs or readyPrompts
 * อ้างอิง: background/index.js บรรทัด 275-325
 */
export async function fetchPrompts(userId, projectId) {
  // Try jobs collection first
  const jobsUrl = `${BASE_URL}/users/${userId}/projects/${projectId}/jobs?key=${API_KEY}`;
  const jobsRes = await fetch(jobsUrl);
  const jobsData = await jobsRes.json();
  
  if (jobsData.documents) {
    for (const doc of jobsData.documents) {
      const prompts = parseValue(doc.fields?.prompts);
      if (Array.isArray(prompts) && prompts.length > 0) {
        return prompts.filter(p => p && String(p).trim());
      }
    }
  }
  
  // Fallback to readyPrompts
  const readyUrl = `${BASE_URL}/users/${userId}/projects/${projectId}/readyPrompts?key=${API_KEY}`;
  const readyRes = await fetch(readyUrl);
  const readyData = await readyRes.json();
  
  if (readyData.documents) {
    for (const doc of readyData.documents) {
      const prompts = parseValue(doc.fields?.prompts);
      if (Array.isArray(prompts) && prompts.length > 0) {
        return prompts.map(p => 
          typeof p === 'object' ? p.englishPrompt : p
        ).filter(Boolean);
      }
    }
  }
  
  return [];
}

/**
 * Save block to Firestore (Admin)
 */
export async function saveBlock(block) {
  const url = `${BASE_URL}/global_recipe_blocks?key=${API_KEY}`;
  // ... implementation
}
```

### 2.2 Task Checklist

- [ ] **2.2.1** สร้าง `src/utils/firebase.js`
- [ ] **2.2.2** Implement `parseValue()` (จาก `fromFirestoreValue`)
- [ ] **2.2.3** Implement `fetchProjects()`
- [ ] **2.2.4** Implement `fetchBlock()`
- [ ] **2.2.5** Implement `fetchPrompts()`
- [ ] **2.2.6** Implement `fetchJobs()`
- [ ] **2.2.7** Implement `saveBlock()` (Admin)
- [ ] **2.2.8** ทดสอบ API calls

---

## Phase 3: Key-based Authentication

### 3.1 Key Decoder (JavaScript)

📁 **อ้างอิง:** `extension/src/App.jsx` บรรทัด 38-52

```javascript
// src/utils/auth.js

/**
 * Decode base64 key to user data
 * Format: userId:ADMIN|USER:timestamp:random
 * อ้างอิง: App.jsx บรรทัด 38-52
 */
export function decodeKey(key) {
  try {
    const decoded = atob(key);
    const parts = decoded.split(':');
    if (parts.length >= 2) {
      return {
        userId: parts[0],
        isAdmin: parts[1] === 'ADMIN',
        timestamp: parts[2] || null,
        random: parts[3] || null
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save key to local storage (electron-store)
 */
export async function saveKey(key) {
  return window.electronAPI.saveConfig('licenseKey', key);
}

/**
 * Load saved key
 */
export async function loadKey() {
  return window.electronAPI.loadConfig('licenseKey');
}
```

### 3.2 Login Page

```jsx
// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { decodeKey, saveKey, loadKey } from '../utils/auth';

export default function Login({ onLogin }) {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Auto-login if key exists
  useEffect(() => {
    loadKey().then(savedKey => {
      if (savedKey) {
        const decoded = decodeKey(savedKey);
        if (decoded) {
          onLogin(decoded);
          return;
        }
      }
      setLoading(false);
    });
  }, []);

  const handleLogin = async () => {
    const decoded = decodeKey(keyInput.trim());
    if (!decoded) {
      setError('Invalid key format');
      return;
    }
    
    await saveKey(keyInput.trim());
    onLogin(decoded);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🚀 Content Auto Post</h1>
        <p>Desktop Agent</p>
        
        <input
          type="text"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="Paste your License Key here..."
          className="key-input"
        />
        
        {error && <p className="error">{error}</p>}
        
        <button 
          onClick={handleLogin} 
          disabled={!keyInput.trim()}
          className="login-btn"
        >
          Connect Agent
        </button>
      </div>
    </div>
  );
}
```

### 3.3 Task Checklist

- [ ] **3.3.1** สร้าง `src/utils/auth.js`
- [ ] **3.3.2** สร้าง `src/pages/Login.jsx`
- [ ] **3.3.3** Implement `electron-store` สำหรับเก็บ Key
- [ ] **3.3.4** Implement Auto-login
- [ ] **3.3.5** ทดสอบ Login flow

---

## Phase 4: Project Management UI

### 4.1 Dashboard

```jsx
// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { fetchProjects } from '../utils/firebase';
import ProjectList from '../components/ProjectList';
import InstanceManager from '../components/InstanceManager';

export default function Dashboard({ user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects(user.userId).then(data => {
      setProjects(data);
      setLoading(false);
    });
  }, [user.userId]);

  const handleCreateInstance = async (project) => {
    const instanceId = `instance_${Date.now()}`;
    const result = await window.electronAPI.createInstance(instanceId, project);
    if (result.success) {
      setInstances(prev => [...prev, { id: instanceId, ...project, status: 'running' }]);
    }
  };

  const handleRunBlock = async (instanceId, blockName) => {
    await window.electronAPI.runBlock(instanceId, blockName);
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Content Auto Post</h1>
        <div className="user-info">
          <span>{user.isAdmin ? '👑 Admin' : '👤 User'}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main>
        <section className="projects-section">
          <h2>📁 Your Projects</h2>
          <ProjectList 
            projects={projects} 
            loading={loading}
            onCreateInstance={handleCreateInstance}
          />
        </section>

        <section className="instances-section">
          <h2>🖥️ Chrome Instances</h2>
          <InstanceManager 
            instances={instances}
            onRunBlock={handleRunBlock}
          />
        </section>
      </main>
    </div>
  );
}
```

### 4.2 Task Checklist

- [ ] **4.2.1** สร้าง `src/pages/Dashboard.jsx`
- [ ] **4.2.2** สร้าง `src/components/ProjectList.jsx`
- [ ] **4.2.3** สร้าง `src/components/ProjectCard.jsx`
- [ ] **4.2.4** สร้าง `src/components/InstanceManager.jsx`
- [ ] **4.2.5** สร้าง `src/components/BlockRunner.jsx`
- [ ] **4.2.6** ทดสอบ UI flow

---

## Phase 5: Playwright Player (JavaScript)

### 5.1 Step Execution Engine

📁 **อ้างอิง:** `extension/src/content/player.js` บรรทัด 260-565

```javascript
// automation/player.js

const { chromium } = require('playwright');
const path = require('path');

class PlaywrightPlayer {
  constructor(profilePath, headless = false) {
    this.profilePath = profilePath;
    this.headless = headless;
    this.browser = null;
    this.page = null;
    this._pendingPrompt = null;
    this._sceneCountBefore = 0;
  }

  async start() {
    this.browser = await chromium.launchPersistentContext(this.profilePath, {
      headless: this.headless,
      viewport: { width: 1280, height: 720 },
      args: ['--disable-blink-features=AutomationControlled']
    });
    this.page = this.browser.pages()[0] || await this.browser.newPage();
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Find element with custom selector support
   * อ้างอิง: player.js บรรทัด 13-161
   */
  async findElement(selector, timeout = 15000) {
    // Custom $scene:last selector
    if (selector.startsWith('$')) {
      const selectorWithoutDollar = selector.slice(1);
      
      if (selectorWithoutDollar === 'scene:last') {
        const locator = this.page.locator('[role="listitem"]').last();
        await locator.waitFor({ timeout });
        return locator;
      }
      
      if (selectorWithoutDollar.includes(':last')) {
        const baseSelector = selectorWithoutDollar.replace(':last', '').trim();
        const locator = this.page.locator(baseSelector).last();
        await locator.waitFor({ timeout });
        return locator;
      }
    }

    // Text-based selector
    if (selector.includes('::text=')) {
      const [tag, textPart] = selector.split('::text=');
      const text = textPart.replace(/['"]/g, '');
      const locator = this.page.locator(`${tag || '*'}:has-text("${text}")`);
      await locator.waitFor({ timeout });
      return locator;
    }

    // Standard CSS selector
    const locator = this.page.locator(selector);
    await locator.waitFor({ timeout });
    return locator;
  }

  /**
   * Execute a single step
   * อ้างอิง: player.js บรรทัด 386-565
   */
  async executeStep(step, variables = {}) {
    const { action, selector } = step;
    console.log(`🚀 Executing: ${action} on ${selector || 'N/A'}`);

    try {
      await this.sleep(500); // Human-like delay

      // === Special Actions (no element needed) ===
      
      if (action === 'wait_for_element') {
        const timeout = step.timeout || 300000;
        await this.page.waitForSelector(selector, { timeout });
        return true;
      }

      if (action === 'wait_for_disappear') {
        const timeout = step.timeout || 300000;
        await this.page.waitForSelector(selector, { state: 'hidden', timeout });
        return true;
      }

      if (action === 'count_elements') {
        const count = await this.page.locator(selector).count();
        this._sceneCountBefore = count;
        console.log(`🔢 Count: ${count}`);
        return true;
      }

      if (action === 'wait') {
        const duration = step.duration || step.value || 1000;
        await this.sleep(duration);
        return true;
      }

      if (action === 'loop_start') {
        console.log('🔄 LOOP_START marker');
        return true;
      }

      if (action === 'loop_end') {
        console.log('🏁 LOOP_END marker');
        return { loopEnd: true };
      }

      if (action === 'inject_prompt') {
        const prompt = variables.prompt || variables.currentPrompt || '';
        if (prompt) {
          this._pendingPrompt = prompt;
          console.log(`📝 Prompt loaded: ${prompt.slice(0, 50)}...`);
        }
        return true;
      }

      if (action === 'wait_for_progress_complete') {
        const timeout = step.timeout || 600000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
          const el = await this.page.$(selector);
          if (!el) {
            console.log('✅ Progress completed');
            return true;
          }
          
          const text = await el.textContent().catch(() => '');
          if (text && text.includes('100')) {
            console.log('✅ Progress reached 100%');
            await this.sleep(2000);
            return true;
          }
          
          await this.sleep(2000);
        }
        return false;
      }

      // === Check for modifiers ===
      if (step.modifiers) {
        return await this.executeStepWithModifiers(step, variables);
      }

      // === Standard Actions (need element) ===
      const el = await this.findElement(selector);

      if (action === 'click') {
        await el.click();
        return true;
      }

      if (action === 'type' || action === 'input') {
        let value = step.value || '';
        
        // Use pending prompt
        if (value === '{{prompt}}' && this._pendingPrompt) {
          value = this._pendingPrompt;
          this._pendingPrompt = null;
        }
        
        // Variable injection
        if (value.includes('{{')) {
          for (const [key, val] of Object.entries(variables)) {
            const replacement = Array.isArray(val) ? val.join(', ') : String(val || '');
            value = value.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), replacement);
          }
        }
        
        await el.fill(value);
        return true;
      }

      return true;

    } catch (error) {
      console.error(`❌ Step Failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute step with pre/post modifiers
   * อ้างอิง: player.js บรรทัด 261-383
   */
  async executeStepWithModifiers(step, variables) {
    const { preActions = [], postActions = [] } = step.modifiers || {};

    // === PRE-ACTIONS ===
    for (const action of preActions.sort((a, b) => (a.order || 0) - (b.order || 0))) {
      console.log(`   ▶️ PRE: ${action.type}`);
      
      if (action.type === 'count_scenes') {
        const sel = action.selector || '[role="listitem"]';
        this._sceneCountBefore = await this.page.locator(sel).count();
      }
      
      if (action.type === 'inject_prompt') {
        const prompt = variables.prompt || variables.currentPrompt || '';
        if (prompt) this._pendingPrompt = prompt;
      }
    }

    // === MAIN ACTION ===
    try {
      const el = await this.findElement(step.selector);
      if (step.action === 'click') await el.click();
    } catch (error) {
      console.error(`   ❌ Main action failed: ${error.message}`);
      return false;
    }

    // === POST-ACTIONS ===
    for (const action of postActions.sort((a, b) => (a.order || 0) - (b.order || 0))) {
      console.log(`   ▶️ POST: ${action.type}`);
      
      if (action.type === 'wait_progress') {
        const sel = action.selector || '.sc-dd6abb21-1';
        const timeout = 600000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
          const el = await this.page.$(sel);
          if (!el) {
            console.log('   ✅ Progress completed');
            break;
          }
          await this.sleep(2000);
        }
      }
      
      if (action.type === 'validate_scene') {
        await this.sleep(2000);
        const sel = action.selector || '[role="listitem"]';
        const countAfter = await this.page.locator(sel).count();
        if (countAfter > this._sceneCountBefore) {
          console.log(`   ✅ Validation: ${this._sceneCountBefore} → ${countAfter}`);
        } else {
          console.log(`   ❌ Validation failed`);
          return false;
        }
      }
      
      if (action.type === 'wait_after') {
        const duration = action.duration || 5000;
        await this.sleep(duration);
      }
    }

    return true;
  }

  /**
   * Execute entire block with loop support
   * อ้างอิง: player.js บรรทัด 700-783
   */
  async executeBlock(block, prompts = []) {
    const { steps = [] } = block;
    const hasLoop = steps.some(s => ['loop_start', 'loop_end'].includes(s.action));

    if (hasLoop && prompts.length > 0) {
      console.log(`🔄 Executing block with ${prompts.length} prompts`);

      for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
        const variables = {
          prompt: prompts[promptIndex],
          sceneIndex: promptIndex + 1,
          prompts
        };

        let i = 0;
        while (i < steps.length) {
          const step = steps[i];

          if (step.action === 'loop_start') {
            i++;
            continue;
          }

          if (step.action === 'loop_end') {
            break; // Next prompt iteration
          }

          const result = await this.executeStep(step, variables);
          if (!result) {
            console.error(`❌ Step ${i + 1} failed`);
            return false;
          }

          i++;
        }

        console.log(`✅ Completed prompt ${promptIndex + 1}/${prompts.length}`);
      }
    } else {
      // No loop - execute all steps once
      const variables = { prompt: prompts[0] || '', prompts };
      for (let i = 0; i < steps.length; i++) {
        const result = await this.executeStep(steps[i], variables);
        if (!result) {
          console.error(`❌ Step ${i + 1} failed`);
          return false;
        }
      }
    }

    return true;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { PlaywrightPlayer };
```

### 5.2 Task Checklist

- [ ] **5.2.1** สร้าง `automation/player.js`
- [ ] **5.2.2** Implement `findElement()` with custom selectors
- [ ] **5.2.3** Implement `executeStep()` with all actions
- [ ] **5.2.4** Implement `executeStepWithModifiers()`
- [ ] **5.2.5** Implement `executeBlock()` with loop support
- [ ] **5.2.6** ทดสอบกับ Block จริง

---

## Phase 6: Playwright Recorder (Admin)

### 6.1 Task Checklist

- [ ] **6.1.1** สร้าง `automation/recorder.js`
- [ ] **6.1.2** Implement Codegen integration
- [ ] **6.1.3** สร้าง UI สำหรับ Add Modifiers
- [ ] **6.1.4** สร้าง UI สำหรับ Add Variables
- [ ] **6.1.5** ทดสอบ Record → Save → Run

---

## Phase 7: Multi-Instance Manager

### 7.1 Instance Manager

```javascript
// automation/instance-manager.js

const { PlaywrightPlayer } = require('./player');
const path = require('path');
const fs = require('fs');

class InstanceManager {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.instances = new Map(); // instanceId -> PlaywrightPlayer
    this.states = new Map();    // instanceId -> state
    this._loadStates();
  }

  _loadStates() {
    const stateFile = path.join(this.dataDir, 'instances.json');
    if (fs.existsSync(stateFile)) {
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      Object.entries(data).forEach(([id, state]) => this.states.set(id, state));
    }
  }

  _saveStates() {
    const stateFile = path.join(this.dataDir, 'instances.json');
    const data = Object.fromEntries(this.states.entries());
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify(data, null, 2));
  }

  async createInstance(instanceId, project, headless = false) {
    const profilePath = path.join('./profiles', instanceId);
    
    const player = new PlaywrightPlayer(profilePath, headless);
    await player.start();
    
    this.instances.set(instanceId, player);
    this.states.set(instanceId, {
      projectId: project.id,
      projectName: project.name,
      userId: project.userId,
      status: 'running',
      profilePath
    });
    this._saveStates();
    
    return player;
  }

  async stopInstance(instanceId) {
    const player = this.instances.get(instanceId);
    if (player) {
      await player.stop();
      this.instances.delete(instanceId);
    }
    
    const state = this.states.get(instanceId);
    if (state) {
      state.status = 'stopped';
      this._saveStates();
    }
  }

  async runBlockOnInstance(instanceId, block, prompts) {
    const player = this.instances.get(instanceId);
    if (!player) {
      console.error(`❌ Instance ${instanceId} not found`);
      return false;
    }

    // Navigate to start URL if needed
    if (block.startUrl) {
      await player.page.goto(block.startUrl);
      await player.sleep(2000);
    }

    return await player.executeBlock(block, prompts);
  }

  async runAllInstances(block, promptsMap) {
    const tasks = [];
    
    for (const [instanceId, state] of this.states.entries()) {
      if (state.status !== 'running') continue;
      
      const prompts = promptsMap.get(instanceId) || [];
      tasks.push(this.runBlockOnInstance(instanceId, block, prompts));
    }
    
    return await Promise.all(tasks);
  }

  getAllInstances() {
    return Array.from(this.states.entries()).map(([id, state]) => ({
      id,
      ...state
    }));
  }
}

module.exports = { InstanceManager };
```

### 7.2 Task Checklist

- [ ] **7.2.1** สร้าง `automation/instance-manager.js`
- [ ] **7.2.2** Implement `createInstance()`
- [ ] **7.2.3** Implement `stopInstance()`
- [ ] **7.2.4** Implement `runBlockOnInstance()`
- [ ] **7.2.5** Implement `runAllInstances()`
- [ ] **7.2.6** สร้าง UI สำหรับ Instance Management
- [ ] **7.2.7** ทดสอบ Multi-instance

---

## Phase 8: Scheduler & Auto-Run

### 8.1 Task Checklist

- [ ] **8.1.1** สร้าง `automation/scheduler.js`
- [ ] **8.1.2** Implement job checking loop
- [ ] **8.1.3** Implement scheduled job execution
- [ ] **8.1.4** สร้าง UI สำหรับ Scheduler status

---

## Phase 9: Auto-Update System ⭐

### 9.1 How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                      AUTO-UPDATE FLOW                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Admin แก้โค้ด]                                                  │
│       ↓                                                          │
│  [npm run electron:publish]                                      │
│       ↓                                                          │
│  [Upload ไป GitHub Releases อัตโนมัติ]                            │
│       ↓                                                          │
│  ┌────────────────────────────────────────┐                      │
│  │ GitHub Release v1.1.0                  │                      │
│  │ - ContentAutoPost-Setup-1.1.0.exe     │                      │
│  │ - latest.yml (metadata)               │                      │
│  └────────────────────────────────────────┘                      │
│                                                                  │
│                         ↓ ลูกค้าเปิด App                          │
│                                                                  │
│  [App เช็ค GitHub] → [พบ Version ใหม่] → [แสดง Popup]             │
│                                                                  │
│  ┌────────────────────────────────────────┐                      │
│  │  🔔 Update Available!                  │                      │
│  │                                        │                      │
│  │  New version 1.1.0 is available       │                      │
│  │  Current version: 1.0.0               │                      │
│  │                                        │                      │
│  │  [Update Now]  [Later]                │                      │
│  └────────────────────────────────────────┘                      │
│                                                                  │
│       ↓ กด Update Now                                            │
│                                                                  │
│  [ดาวน์โหลด .exe ใหม่] → [ติดตั้งทับ] → [รีสตาร์ท App]            │
│                                                                  │
│       ✅ ลูกค้าใช้งาน Version ใหม่ได้เลย!                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Updater Module

```javascript
// electron/updater.js

const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');

function setupAutoUpdater(mainWindow) {
  // Check for updates on app start
  autoUpdater.checkForUpdatesAndNotify();

  // Events
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version
    });
  });

  autoUpdater.on('error', (error) => {
    mainWindow.webContents.send('update-error', error.message);
  });

  // IPC handlers
  ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });
}

module.exports = { setupAutoUpdater };
```

### 9.3 Update Notification Component

```jsx
// src/components/UpdateNotification.jsx
import { useState, useEffect } from 'react';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for update events from main process
    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
    });

    window.electronAPI.onUpdateProgress((prog) => {
      setDownloading(true);
      setProgress(prog.percent);
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      setDownloading(false);
      setReady(true);
    });
  }, []);

  if (!updateInfo) return null;

  const handleDownload = () => {
    window.electronAPI.downloadUpdate();
    setDownloading(true);
  };

  const handleInstall = () => {
    window.electronAPI.installUpdate();
  };

  return (
    <div className="update-notification">
      <div className="update-card">
        <h3>🔔 Update Available!</h3>
        <p>Version {updateInfo.version} is ready</p>
        
        {downloading && (
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }} />
            <span>{Math.round(progress)}%</span>
          </div>
        )}

        <div className="actions">
          {!downloading && !ready && (
            <>
              <button onClick={handleDownload} className="primary">
                Update Now
              </button>
              <button onClick={() => setUpdateInfo(null)}>
                Later
              </button>
            </>
          )}
          
          {ready && (
            <button onClick={handleInstall} className="primary">
              Restart & Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 9.4 Task Checklist

- [ ] **9.4.1** สร้าง `electron/updater.js`
- [ ] **9.4.2** สร้าง `src/components/UpdateNotification.jsx`
- [ ] **9.4.3** เพิ่ม IPC handlers ใน `preload.js`
- [ ] **9.4.4** สร้าง GitHub Repository สำหรับ Releases
- [ ] **9.4.5** ตั้งค่า `electron-builder.yml` สำหรับ publish
- [ ] **9.4.6** ทดสอบ Auto-Update flow

---

## Phase 10: Build & Release

### 10.1 Build Commands

```bash
# Development
npm run electron:dev

# Build for Windows (local)
npm run electron:build

# Build & Publish to GitHub (triggers auto-update)
npm run electron:publish
```

### 10.2 Release Process (สำหรับ Admin)

```
1. แก้ไขโค้ด
2. อัพเดท version ใน package.json (เช่น 1.0.0 → 1.1.0)
3. รัน: npm run electron:publish
4. ไฟล์จะถูก upload ไป GitHub Releases อัตโนมัติ
5. ลูกค้าจะได้รับแจ้งเตือนอัพเดทเมื่อเปิด App
```

### 10.3 Task Checklist

- [ ] **10.3.1** สร้าง `assets/icon.ico`
- [ ] **10.3.2** ตั้งค่า `electron-builder.yml`
- [ ] **10.3.3** สร้าง GitHub Personal Access Token
- [ ] **10.3.4** ทดสอบ Build local
- [ ] **10.3.5** ทดสอบ Publish to GitHub
- [ ] **10.3.6** ทดสอบติดตั้งบนเครื่อง Windows อื่น

---

## 📊 สรุป Timeline

| Phase | เวลาประมาณ | หมายเหตุ |
|-------|-----------|----------|
| Phase 1: Setup | 45 นาที | Electron + React + Playwright JS |
| Phase 2: Firebase | 1 ชม. | JS version (คล้ายเดิม) |
| Phase 3: Auth | 30 นาที | Key decode + Login |
| Phase 4: Project UI | 1 ชม. | Dashboard + Components |
| Phase 5: Player | 2 ชม. | Step execution (JS) |
| Phase 6: Recorder | 1.5 ชม. | Admin only |
| Phase 7: Multi-Instance | 1 ชม. | Parallel execution |
| Phase 8: Scheduler | 30 นาที | Auto-run jobs |
| Phase 9: Auto-Update | 1 ชม. | electron-updater |
| Phase 10: Build | 30 นาที | Installer + Release |

**รวม: ~10 ชั่วโมง**

---

## ✅ Summary: ลูกค้าจะใช้งานอย่างไร

### การติดตั้ง (ครั้งแรก)

1. ดาวน์โหลด `ContentAutoPost-Setup-1.0.0.exe`
2. ดับเบิลคลิกติดตั้ง
3. เปิดโปรแกรมจาก Desktop Shortcut
4. ใส่ License Key → เริ่มใช้งาน

### การใช้งาน

1. เลือก Project
2. กด "Create Instance" → เปิด Chrome
3. Login Google ใน Chrome (ครั้งแรกเท่านั้น)
4. กด "Run Block" → ระบบทำงานอัตโนมัติ

### การอัพเดท

1. เปิดโปรแกรม → เห็น Popup "Update Available"
2. กด "Update Now"
3. รอดาวน์โหลด → กด "Restart & Install"
4. App รีสตาร์ท → ใช้งาน Version ใหม่ได้เลย

---

## ⏭️ Next Step

~~พิมพ์ **`เริ่ม Phase 1`** เมื่อพร้อมสร้างโครงสร้างโปรเจค (Node.js version)~~

---
---

# 🔧 Refactor Checklist - v1.6.89 → v1.7.x

> **วันที่เริ่ม:** 7 กุมภาพันธ์ 2026
> **เอกสารแผน:** ดูรายละเอียดที่ `REFACTOR_PLAN.md`
> **หลักการ:** แก้ทีละ Phase, ทดสอบให้ผ่านก่อนไปข้อถัดไป

---

## Phase 1: แก้ Block System ทั้งหมด ⬜ (รวม Phase 1+1.5 เดิม)

> **สถาปัตยกรรมใหม่:** `global_recipe_blocks` เป็น **Single Source of Truth**
> ทุก component (Recorder, Dashboard, Scheduler, Shoot to Block) อ่าน/เขียนที่เดียวกัน
> `users/{userId}/blocks` ไม่ใช้อีกต่อไป (เก็บ Firestore Rule ไว้เพื่อ backward compat)

**ปัญหาที่แก้ทั้งหมด:**
- 🔴 **Crash:** `saveBlockToFirestore` ใช้ `db.collection()` ที่ไม่มี (scheduler.js:916)
- 🔴 **BUG-B:** Scheduler อ่าน block จาก path ผิด (`users/{userId}/blocks` ≠ `global_recipe_blocks`)
- � **BUG-A:** Modifiers หายตอน save block (RecorderPanel.jsx:351)
- 🟡 **BUG-F:** Shoot to Block ไม่มี projectId (Dashboard.jsx:939)
- 🔴 **BUG-C:** Firestore Rules block `users/{userId}/blocks` (เพิ่ม rule เพื่อ backward compat)
- 🔵 **ISSUE-H:** label/emoji หายตอน save (RecorderPanel.jsx:351)

### Part A: แก้ Scheduler อ่าน Block จาก path ที่ถูกต้อง (BUG-B)

- [ ] **1.1** อ่าน `scheduler.js` `fetchBlocksFromFirebase` (บรรทัด 167-190) — ปัจจุบันอ่านจาก `users/{userId}/blocks`
- [ ] **1.2** อ่าน `firebase.js` `fetchBlocks` (บรรทัด 118-137) — อ่านจาก `global_recipe_blocks` ✅
- [ ] **1.3** แก้ `fetchBlocksFromFirebase` URL เป็น `global_recipe_blocks` (ไม่ต้องใช้ userId อีก)
- [ ] **1.4** อ่าน `scheduler.js` `getAutomationBlock` (บรรทัด 848-898) — ดู fallback chain
- [ ] **1.5** แก้ `getAutomationBlock` ให้ match block ด้วย `instanceSettings.selectedBlockId` หรือ `block.name` แทน `projectId`

### Part B: แก้ Shoot to Block ให้ใช้ `global_recipe_blocks` (Crash fix + BUG-F)

- [ ] **1.6** อ่าน `Dashboard.jsx` onShootToBlock (บรรทัด 939-966) — ปัจจุบันเรียก `saveBlockToFirestore` ผ่าน IPC
- [ ] **1.7** เปลี่ยน Shoot to Block ให้ใช้ `updateBlock()` จาก `firebase.js` โดยตรง (ไม่ต้องผ่าน IPC อีก)
  ```javascript
  // เดิม (ผ่าน IPC → scheduler.js → crash):
  await window.electronAPI.store.saveBlockToFirestore(userId, blockId, updatedBlock);
  // ใหม่ (เรียก firebase.js ตรงๆ → เขียนไป global_recipe_blocks):
  await updateBlock(blockId, { steps: updatedSteps });
  ```
- [ ] **1.8** เพิ่ม `projectId` จาก instance ใน step data เมื่อ Shoot to Block (BUG-F)
- [ ] **1.9** (Optional) Mark `saveBlockToFirestore` ใน scheduler.js เป็น deprecated

### Part C: แก้ Recorder save ให้ครบทุก field (BUG-A + ISSUE-H)

- [ ] **1.10** อ่าน `RecorderPanel.jsx` `handleSaveBlock` (บรรทัด 351-364)
- [ ] **1.11** เพิ่ม `modifiers: s.modifiers || undefined` ในการ save steps (BUG-A)
- [ ] **1.12** เพิ่ม `label: s.label || undefined, emoji: s.emoji || undefined` (ISSUE-H)

### Part D: Firestore Rules (BUG-C — backward compat)

- [ ] **1.13** เพิ่ม Firestore Rule สำหรับ `users/{userId}/blocks/{blockId}` (allow: true)
- [ ] **1.14** Deploy Firestore Rules: `firebase deploy --only firestore:rules`

### Part E: ทดสอบ

- [ ] **1.15** ทดสอบ: Recorder → ตั้ง Options (retry/wait_progress) → Save → Load → Options ต้องยังอยู่
- [ ] **1.16** ทดสอบ: Debug Selector → Shoot to Block → ต้องไม่ crash + step เพิ่มใน block
- [ ] **1.17** ทดสอบ: Dashboard → โหลด blocks จาก `global_recipe_blocks` → ต้องเห็น blocks ทั้งหมด
- [ ] **1.18** ทดสอบ: Scheduler auto-run → ต้องหา Block เจอจาก `global_recipe_blocks`
- [ ] **1.19** Build + Publish version ใหม่
- [ ] **1.20** อัพเดท บันทึกปัญหา.md

---

## Phase 2: แก้ Debug Selector ไม่จำ Login ⬜

**ไฟล์:** `electron/playwright-bridge.js` บรรทัด 411
**ปัญหา:** ใช้ `process.cwd()` (relative path) → Profile ไปอยู่ผิดที่
**ผลกระทบ:** ล็อกอินแล้วครั้งหน้าหาย

### Checklist

- [ ] **2.1** อ่านโค้ด Debug Selector handler ใน playwright-bridge.js (บรรทัด 392-488)
- [ ] **2.2** เปรียบเทียบกับ Instance launch (บรรทัด 56) และ Recorder (recorder.js:53)
- [ ] **2.3** เปลี่ยน path → ใช้ `getProfilesDir()` + `'debug-selector'`
- [ ] **2.4** เพิ่ม `deviceScaleFactor: undefined` + args ให้เหมือน Instance
- [ ] **2.5** เพิ่ม `ignoreDefaultArgs: ['--enable-automation']`
- [ ] **2.6** ทดสอบ: เปิด Debug Selector → Login → ปิด → เปิดใหม่ → ต้องยังล็อกอินอยู่
- [ ] **2.7** Build + Publish version ใหม่
- [ ] **2.8** อัพเดท บันทึกปัญหา.md

---

## Phase 3: แก้ `saveUserTimezone` ที่ใช้ `fetch()` ใน Node.js ⬜

**ไฟล์:** `electron/scheduler.js` บรรทัด 339-373
**ปัญหา:** ใช้ `fetch()` ในขณะที่ฟังก์ชันอื่นทั้งหมดใช้ `https` module
**ผลกระทบ:** อาจพังบางเครื่องที่ Electron ไม่มี global fetch

### Checklist

- [ ] **3.1** อ่านฟังก์ชัน `saveUserTimezone` ใน scheduler.js (บรรทัด 339-373)
- [ ] **3.2** อ่าน helper `postJSON` ที่มีอยู่แล้ว (บรรทัด 61-92)
- [ ] **3.3** อ่าน IPC handler `scheduler:set-timezone` ใน main.js (บรรทัด 314-316)
- [ ] **3.4** อ่าน SchedulerPanel.jsx ตรงที่เรียก setTimezone
- [ ] **3.5** สร้าง helper `patchJSON(url, body)` ใช้ `https.request` method PATCH
- [ ] **3.6** เปลี่ยน `saveUserTimezone` ให้ใช้ `patchJSON` แทน `fetch`
- [ ] **3.7** 🟡 **BUG-E:** แก้ `parseFirestoreValue` (บรรทัด 97-113) เพิ่ม 3 types ที่ขาด:
  - `if (value.timestampValue !== undefined) return new Date(value.timestampValue);`
  - `if (value.doubleValue !== undefined) return value.doubleValue;`
  - `if (value.nullValue !== undefined) return null;`
- [ ] **3.8** 🔵 **ISSUE-G:** แก้ `episodeTopic` (บรรทัด 758) เป็น `readyPromptData.episodeTitle || ''` (field name ไม่ตรงกับ Cloud Function)
- [ ] **3.9** ทดสอบ: เปลี่ยน Timezone ใน SchedulerPanel → ต้องบันทึกได้
- [ ] **3.10** ทดสอบ: Scheduler fetch readyPrompts → timestamps ต้อง parse เป็น Date ถูกต้อง
- [ ] **3.11** Build + Publish version ใหม่
- [ ] **3.12** อัพเดท บันทึกปัญหา.md

---

## Phase 4: แก้ Memory Leak จาก `ipcRenderer.on` ⬜

**ไฟล์:** `electron/preload.js` (10 จุด) + Frontend components
**ปัญหา:** `ipcRenderer.on()` เพิ่ม listener ซ้ำทุกครั้งที่ mount โดยไม่ลบ
**ผลกระทบ:** ใช้ไปนานๆ แอปกิน RAM มากขึ้น

### Checklist

- [ ] **4.1** อ่าน preload.js ทุกจุดที่มี `ipcRenderer.on` (10 จุด)
- [ ] **4.2** อ่าน App.jsx ตรง `onUpdateStatus` + `onGoogleLoginReminder`
- [ ] **4.3** อ่าน SchedulerPanel.jsx ตรง `onTrigger`, `onUpdate`, `onStatus`, `onAutoStarted`
- [ ] **4.4** อ่าน RecorderPanel.jsx ตรง `onStarted`, `onStopped`, `onStep`
- [ ] **4.5** ตรวจสอบ: `onInstanceStatus` (preload.js:49-51) เป็น Dead Code (ไม่มี component ใดเรียกใช้)
- [ ] **4.6** แก้ preload.js: เพิ่ม `removeAllListeners` ก่อน `on` ทุกจุด
- [ ] **4.7** (Optional) เพิ่ม `off` function ให้ Frontend เรียก cleanup
- [ ] **4.8** ทดสอบ: สลับ tab ไปมาหลายรอบ → ตรวจ memory ใน Task Manager
- [ ] **4.9** ทดสอบ: Scheduler, Recorder, Instance ยังทำงานปกติ
- [ ] **4.10** Build + Publish version ใหม่
- [ ] **4.11** อัพเดท บันทึกปัญหา.md

---

## Phase 5: รวมโค้ดซ้ำกัน 400+ บรรทัด ⬜

**ไฟล์:** `electron/playwright-bridge.js`
**ปัญหา:** launch browser + run block มีโค้ดซ้ำ 2 ชุด (IPC handler + Direct function)
**ผลกระทบ:** แก้บั๊กต้องแก้ 2 ที่ ลืมที่ไหนก็พัง

> 🚨 **BUG ที่พบจากการจำลอง:** IPC `playwright:run-block` มีบั๊กใน Normal Mode — เมื่อ step ล้มเหลวจะ `break` แล้ว return `success: true` (ผิด!) หลังรวมโค้ดจะถูกแก้โดยอัตโนมัติ (Direct function return `success: false` ถูกต้อง) — **Dashboard อาจแสดง "failed" มากขึ้นกว่าเดิม เพราะเดิมซ่อนไว้**

### Checklist

- [ ] **5.1** อ่าน IPC `playwright:launch` (บรรทัด 50-156) ทุกบรรทัด
- [ ] **5.2** อ่าน `launchInstance` direct function (บรรทัด 1004-1120) ทุกบรรทัด
- [ ] **5.3** จดรายการความแตกต่างระหว่าง 2 ชุด launch
- [ ] **5.4** อ่าน IPC `playwright:run-block` (บรรทัด 182-353) ทุกบรรทัด
- [ ] **5.5** อ่าน `runBlock` direct function (บรรทัด 1126-1293) ทุกบรรทัด
- [ ] **5.6** จดรายการความแตกต่างระหว่าง 2 ชุด runBlock
- [ ] **5.7** แก้ IPC `playwright:launch` ให้เรียก `launchInstance()` แทนโค้ดซ้ำ
- [ ] **5.8** แก้ IPC `playwright:run-block` ให้เรียก `runBlock()` แทนโค้ดซ้ำ
- [ ] **5.8.1** ตรวจสอบ Behavior Change: Normal mode error เดิม success:true → ใหม่ success:false (แก้ bug)
- [ ] **5.9** 🔴 **BUG-D:** อ่าน `instance-manager.js` `executeStep` (บรรทัด 147-179) — มีแค่ 5 actions!
- [ ] **5.10** แก้ `instance-manager.js` `runBlockOnInstance` ให้ใช้ `executeStepWithModifiers` จาก playwright-bridge.js แทน executeStep ของตัวเอง
- [ ] **5.11** ลบ `executeStep` function ใน instance-manager.js (โค้ดซ้ำชุดที่ 3)
- [ ] **5.12** ทดสอบ Flow A: กดปุ่ม Launch Instance จาก UI → เปิด browser ปกติ
- [ ] **5.13** ทดสอบ Flow B: Scheduler auto-launch → เปิด browser ปกติ
- [ ] **5.14** ทดสอบ Flow C: กดปุ่ม Test Block จาก UI → รัน Steps ปกติ
- [ ] **5.15** ทดสอบ Flow D: Scheduler auto-run → รัน Steps ปกติ
- [ ] **5.16** ทดสอบ Flow E: instance:run-all (Multi-Instance) → ต้องรองรับ prompt actions + loop
- [ ] **5.17** Build + Publish version ใหม่
- [ ] **5.18** อัพเดท บันทึกปัญหา.md

---

## Phase 6: ย้าย API Key ออกจากโค้ด ⬜

**ไฟล์:** `config/firebase.json` (ใหม่) + `electron/scheduler.js` + `src/lib/firebase.js` + `vite.config.js`
**ปัญหา:** API Key ฝังตรงๆ ใน 2 ไฟล์ (Main + Renderer)
**ผลกระทบ:** แกะ .exe ดูจะเห็น key

> ⚠️ **จากการจำลอง:** `firebase.js` อยู่ฝั่ง Renderer (Vite bundle) ไม่สามารถ `require()` จาก `electron/` ได้
> ต้องใช้ `config/firebase.json` + Vite `define` แทน
> Phase 1 เพิ่ม API_KEY usage ใหม่ 1 จุด → scheduler.js = **11 จุด**หลังแก้ Phase 1

### Checklist

- [ ] **6.1** อ่าน scheduler.js ทุกจุดที่ใช้ `API_KEY` (**11 จุดหลัง Phase 1**: 10 เดิม + 1 จาก saveBlockToFirestore ใหม่)
- [ ] **6.2** อ่าน firebase.js ทุกจุดที่ใช้ `API_KEY` (**20 จุด**: บรรทัด 5,96,120,145,182,206,230,265,286,315,347,379,419,451,485,524,565,646,678,690)
- [ ] **6.3** ตรวจสอบ Firestore Security Rules ว่าเข้มงวดพอหรือไม่
- [ ] **6.4** สร้าง `config/firebase.json` เก็บ `API_KEY`, `PROJECT_ID` (ไฟล์ JSON กลาง)
- [ ] **6.5** แก้ `scheduler.js` ให้ `require('../config/firebase.json')` (Main Process)
- [ ] **6.6** แก้ `vite.config.js` เพิ่ม `define` จาก firebase.json (Renderer Process)
- [ ] **6.7** แก้ `firebase.js` ให้ใช้ `__FIREBASE_API_KEY__` แทน hardcode
- [ ] **6.8** ตรวจสอบ: `npm run build` ผ่านโดยไม่มี error จาก Vite define
- [ ] **6.9** ทดสอบ: เปิด Agent → Login → ดู Projects → ต้องโหลดข้อมูลได้
- [ ] **6.10** ทดสอบ: Scheduler → ต้อง fetch schedule + run ได้
- [ ] **6.11** ทดสอบ: Recorder → ต้อง save block ได้
- [ ] **6.12** Build + Publish version ใหม่
- [ ] **6.13** อัพเดท บันทึกปัญหา.md

---

## Phase 7: แก้ Scheduler Block-Project Matching ⬜

**ไฟล์:** `electron/scheduler.js` บรรทัด 848-898
**ปัญหา:** `getAutomationBlock()` ไม่สามารถเชื่อม Block กับ Project ได้ → ใช้ block แรกเสมอ (ทุก Project ใช้ Block เดียวกัน)
**ผลกระทบ:** ถ้ามีหลาย Block → Project อาจรัน Block ผิดตัว
**หมายเหตุ:** ปัญหาเดิมที่มีอยู่ก่อน refactor — Phase 1 ทำให้เห็นชัดขึ้น

### Checklist

- [ ] **7.1** อ่าน `scheduler.js` `getAutomationBlock` (บรรทัด 848-898)
- [ ] **7.2** อ่าน `firebase.js` `fetchInstanceSettings` (บรรทัด 440-475)
- [ ] **7.3** อ่าน Dashboard.jsx instance creation — ดูว่า instance เก็บ projectId ไว้ที่ไหน
- [ ] **7.4** อ่าน electron-store ว่าเก็บ instances data อย่างไร
- [ ] **7.5** แก้ `getAutomationBlock`:
  - อ่าน instances จาก electron-store → หา instance ที่มี `projectId` ตรง
  - ดึง `selectedBlockId` จาก `instance_settings` ของ instance นั้น
  - ใช้ `selectedBlockId` ค้นหา block จาก `global_recipe_blocks`
  - ถ้าหาไม่เจอ → fallback ใช้ block แรก
- [ ] **7.6** ทดสอบ: สร้าง 2 Project + 2 Block → Scheduler ต้องใช้ Block ถูกตัวกับแต่ละ Project
- [ ] **7.7** ทดสอบ: Project ที่ไม่มี instance → ต้อง fallback ไม่ crash
- [ ] **7.8** Build + Publish version ใหม่
- [ ] **7.9** อัพเดท บันทึกปัญหา.md

---

## Phase 8: รวม toFirestoreValue ซ้ำ + แก้ Execution Logs Path ⬜

**ไฟล์:** `electron/scheduler.js`, `src/lib/firebase.js`, `frontend/`
**ปัญหา A:** `toFirestoreValue` มี 2 copy ซ้ำ (firebase.js:38-72 + scheduler.js:201-216) — แก้ที่หนึ่งลืมอีกที่
**ปัญหา B:** Execution Logs path ไม่ตรง — Desktop เขียน `executionLogs` (camelCase, flat) แต่ Web App อาจใช้ `execution_logs` (snake_case, nested)
**ผลกระทบ A:** Data format ไม่ตรงกันในอนาคต
**ผลกระทบ B:** Web App อาจดู logs ไม่เจอ

### Checklist

- [ ] **8.1** อ่าน `firebase.js` `toFirestoreValue` (บรรทัด 38-72)
- [ ] **8.2** อ่าน `scheduler.js` inline `toFirestoreValue` ใน `saveExecutionLogFromScheduler` (บรรทัด 201-216)
- [ ] **8.3** เปรียบเทียบ 2 copies — จดความแตกต่าง
- [ ] **8.4** สร้าง `electron/firestoreHelpers.js` เก็บ `toFirestoreValue` + `parseFirestoreValue` ที่เดียว
- [ ] **8.5** แก้ `scheduler.js` ให้ import จาก `firestoreHelpers.js`
- [ ] **8.6** ตรวจสอบ Web App (`frontend/`) ว่าใช้ execution_logs path ไหน
- [ ] **8.7** แก้ให้ Desktop Agent + Web App ใช้ path เดียวกัน หรือเพิ่ม alias query
- [ ] **8.8** ทดสอบ: Scheduler → save execution log → ดูใน Firebase Console ว่า format ถูกต้อง
- [ ] **8.9** ทดสอบ: Web App → ต้องเห็น logs ที่ Desktop Agent สร้าง
- [ ] **8.10** Build + Publish version ใหม่
- [ ] **8.11** อัพเดท บันทึกปัญหา.md

---

## 📊 สรุปสถานะ Refactor (Final — 8 Phase)

> **กลุ่ม A (Phase 1-4):** แก้บักร้ายแรง — crash, path ผิด, data หาย, memory leak
> **กลุ่ม B (Phase 5-6):** ปรับโครงสร้าง — รวมโค้ดซ้ำ, ย้าย key
> **กลุ่ม C (Phase 7-8):** ปรับปรุงคุณภาพ — matching logic, data alignment

| Phase | ปัญหา | BUG ที่แก้ | สถานะ | Version |
|-------|-------|-----------|-------|---------|
| **1** | **Block System ทั้งหมด** (รวม 1+1.5) | BUG-A,B,C,F,H + crash | ⬜ ยังไม่เริ่ม | - |
| 2 | Debug Selector ไม่จำ Login | — | ⬜ ยังไม่เริ่ม | - |
| 3 | `fetch()` ใน Node.js | BUG-E, ISSUE-G | ⬜ ยังไม่เริ่ม | - |
| 4 | Memory Leak listener | — | ⬜ ยังไม่เริ่ม | - |
| 5 | โค้ดซ้ำ 400+ บรรทัด | BUG-D, P5 | ⬜ ยังไม่เริ่ม | - |
| 6 | API Key ฝังในโค้ด | P6-a | ⬜ ยังไม่เริ่ม | - |
| **7** | **Scheduler Block-Project Matching** | — | ⬜ ยังไม่เริ่ม | - |
| **8** | **toFirestoreValue ซ้ำ + Logs Path** | — | ⬜ ยังไม่เริ่ม | - |
