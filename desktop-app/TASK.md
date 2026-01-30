# 📋 Task: Desktop App Implementation

> แผนงานละเอียดสำหรับสร้าง Desktop App แทน Chrome Extension
> แต่ละขั้นตอนมีการอ้างอิงโค้ดจริงจากโปรเจคปัจจุบัน

---

## 📌 สารบัญ

1. [Phase 1: Project Setup](#phase-1-project-setup)
2. [Phase 2: Firebase Integration](#phase-2-firebase-integration)
3. [Phase 3: Key-based Authentication](#phase-3-key-based-authentication)
4. [Phase 4: Project Management UI](#phase-4-project-management-ui)
5. [Phase 5: Playwright Player](#phase-5-playwright-player)
6. [Phase 6: Playwright Recorder (Admin)](#phase-6-playwright-recorder-admin)
7. [Phase 7: Multi-Instance Manager](#phase-7-multi-instance-manager)
8. [Phase 8: Scheduler & Auto-Run](#phase-8-scheduler--auto-run)
9. [Phase 9: Testing & Polish](#phase-9-testing--polish)

---

## Phase 1: Project Setup

### 1.1 สร้างโครงสร้างโฟลเดอร์

```
desktop-app/
├── electron/              # Electron main process
│   ├── main.js           # Main entry point
│   ├── preload.js        # Preload script
│   └── ipc-handlers.js   # IPC handlers
│
├── src/                   # React UI (renderer)
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utilities
│   ├── App.jsx           # Main app
│   └── main.jsx          # React entry
│
├── playwright/            # Playwright automation
│   ├── player.py         # Step execution
│   ├── recorder.py       # Step recording
│   ├── instance_manager.py # Multi-instance
│   └── firebase_client.py # Firebase REST API
│
├── profiles/              # Chrome profiles (persistent login)
│   ├── instance_1/
│   ├── instance_2/
│   └── ...
│
├── data/                  # Local data
│   ├── config.json       # App config
│   └── instances.json    # Instance states
│
├── package.json          # Node dependencies
├── requirements.txt      # Python dependencies
├── WALKTHROUGH.md        # Documentation
└── TASK.md              # This file
```

### 1.2 Task Checklist

- [ ] **1.2.1** สร้างโฟลเดอร์ตาม structure ด้านบน
- [ ] **1.2.2** สร้าง `package.json` สำหรับ Electron + React
  ```json
  {
    "name": "content-auto-post-desktop",
    "version": "1.0.0",
    "main": "electron/main.js",
    "scripts": {
      "dev": "vite",
      "electron": "electron .",
      "start": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron\"",
      "build": "vite build && electron-builder"
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "electron": "^28.0.0"
    }
  }
  ```
- [ ] **1.2.3** สร้าง `requirements.txt` สำหรับ Python
  ```
  playwright==1.40.0
  requests==2.31.0
  python-dotenv==1.0.0
  ```
- [ ] **1.2.4** สร้าง `electron/main.js` (Electron entry point)
- [ ] **1.2.5** สร้าง `electron/preload.js` (Bridge to renderer)
- [ ] **1.2.6** ตั้งค่า Vite สำหรับ React

### 1.3 อ้างอิงโค้ดเดิม

| ไฟล์ใหม่ | อ้างอิงจาก |
|----------|------------|
| `src/App.jsx` | `extension/src/App.jsx` (structure) |
| `src/components/` | `extension/src/UserPanel.jsx` (UI) |

---

## Phase 2: Firebase Integration

### 2.1 Firebase REST API Client

📁 **อ้างอิง:** `extension/src/background/index.js` บรรทัด 9-10, 46-81

```python
# playwright/firebase_client.py

import requests
from typing import Optional, Dict, List, Any

FIREBASE_PROJECT_ID = "content-auto-post"
API_KEY = "AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE"

class FirebaseClient:
    def __init__(self):
        self.base_url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"
    
    def _parse_value(self, val: Dict) -> Any:
        """Convert Firestore value to Python value"""
        # อ้างอิง: background/index.js บรรทัด 46-62
        if val is None:
            return None
        if 'mapValue' in val:
            return {k: self._parse_value(v) for k, v in val['mapValue'].get('fields', {}).items()}
        if 'arrayValue' in val:
            return [self._parse_value(v) for v in val['arrayValue'].get('values', [])]
        if 'stringValue' in val:
            return val['stringValue']
        if 'integerValue' in val:
            return int(val['integerValue'])
        if 'doubleValue' in val:
            return float(val['doubleValue'])
        if 'booleanValue' in val:
            return val['booleanValue']
        if 'timestampValue' in val:
            return val['timestampValue']
        if 'nullValue' in val:
            return None
        return val
    
    def fetch_projects(self, user_id: str) -> List[Dict]:
        """Fetch projects for a user"""
        # อ้างอิง: UserPanel.jsx บรรทัด 203-234
        url = f"{self.base_url}/users/{user_id}/projects?key={API_KEY}"
        res = requests.get(url)
        data = res.json()
        
        if 'documents' not in data:
            return []
        
        projects = []
        for doc in data['documents']:
            project_id = doc['name'].split('/')[-1]
            fields = doc.get('fields', {})
            projects.append({
                'id': project_id,
                'name': self._parse_value(fields.get('name', {})) or project_id,
                'status': self._parse_value(fields.get('status', {})) or 'idle'
            })
        return projects
    
    def fetch_block(self, block_name: str) -> Optional[Dict]:
        """Fetch block by name"""
        # อ้างอิง: background/index.js บรรทัด 84-134
        url = f"{self.base_url}:runQuery?key={API_KEY}"
        body = {
            "structuredQuery": {
                "from": [{"collectionId": "global_recipe_blocks"}],
                "where": {
                    "fieldFilter": {
                        "field": {"fieldPath": "name"},
                        "op": "EQUAL",
                        "value": {"stringValue": block_name}
                    }
                },
                "limit": 1
            }
        }
        res = requests.post(url, json=body)
        data = res.json()
        
        if not data or not data[0].get('document'):
            return None
        
        doc = data[0]['document']
        fields = doc.get('fields', {})
        
        return {
            'id': doc['name'].split('/')[-1],
            'name': self._parse_value(fields.get('name', {})),
            'type': self._parse_value(fields.get('type', {})) or 'ONCE',
            'startUrl': self._parse_value(fields.get('startUrl', {})) or '',
            'variables': self._parse_value(fields.get('variables', {})) or [],
            'steps': self._parse_value(fields.get('steps', {})) or []
        }
    
    def fetch_prompts(self, user_id: str, project_id: str) -> List[str]:
        """Fetch prompts from jobs or readyPrompts"""
        # อ้างอิง: background/index.js บรรทัด 275-325
        prompts = []
        
        # Try jobs collection first
        jobs_url = f"{self.base_url}/users/{user_id}/projects/{project_id}/jobs?key={API_KEY}"
        jobs_res = requests.get(jobs_url)
        jobs_data = jobs_res.json()
        
        if 'documents' in jobs_data:
            for doc in jobs_data['documents']:
                job_prompts = self._parse_value(doc.get('fields', {}).get('prompts', {}))
                if job_prompts and isinstance(job_prompts, list):
                    prompts = [p for p in job_prompts if p and str(p).strip()]
                    if prompts:
                        return prompts
        
        # Fallback to readyPrompts
        ready_url = f"{self.base_url}/users/{user_id}/projects/{project_id}/readyPrompts?key={API_KEY}"
        ready_res = requests.get(ready_url)
        ready_data = ready_res.json()
        
        if 'documents' in ready_data:
            for doc in ready_data['documents']:
                ready_prompts = self._parse_value(doc.get('fields', {}).get('prompts', {}))
                if ready_prompts and isinstance(ready_prompts, list):
                    # Extract englishPrompt if object
                    prompts = [
                        p.get('englishPrompt', p) if isinstance(p, dict) else p
                        for p in ready_prompts
                        if p
                    ]
                    if prompts:
                        return prompts
        
        return prompts
```

### 2.2 Task Checklist

- [ ] **2.2.1** สร้าง `playwright/firebase_client.py`
- [ ] **2.2.2** Implement `_parse_value()` (จาก `fromFirestoreValue`)
- [ ] **2.2.3** Implement `fetch_projects()` (จาก UserPanel.jsx)
- [ ] **2.2.4** Implement `fetch_block()` (จาก background/index.js)
- [ ] **2.2.5** Implement `fetch_prompts()` (จาก background/index.js)
- [ ] **2.2.6** Implement `fetch_jobs()` สำหรับ Job queue
- [ ] **2.2.7** Implement `save_block()` สำหรับ Admin record
- [ ] **2.2.8** ทดสอบ API calls ทั้งหมด

---

## Phase 3: Key-based Authentication

### 3.1 Key Decoder

📁 **อ้างอิง:** `extension/src/App.jsx` บรรทัด 38-52

```python
# playwright/auth.py

import base64
from dataclasses import dataclass
from typing import Optional

@dataclass
class KeyData:
    user_id: str
    is_admin: bool
    timestamp: Optional[str] = None
    random: Optional[str] = None

def decode_key(key: str) -> Optional[KeyData]:
    """
    Decode base64 key to KeyData
    Format: userId:ADMIN|USER:timestamp:random
    """
    try:
        decoded = base64.b64decode(key).decode('utf-8')
        parts = decoded.split(':')
        if len(parts) >= 2:
            return KeyData(
                user_id=parts[0],
                is_admin=parts[1] == 'ADMIN',
                timestamp=parts[2] if len(parts) > 2 else None,
                random=parts[3] if len(parts) > 3 else None
            )
        return None
    except Exception:
        return None
```

### 3.2 Task Checklist

- [ ] **3.2.1** สร้าง `playwright/auth.py`
- [ ] **3.2.2** Implement `decode_key()` (จาก App.jsx)
- [ ] **3.2.3** สร้าง Login UI ใน React (`src/pages/Login.jsx`)
- [ ] **3.2.4** เก็บ Key ใน `data/config.json`
- [ ] **3.2.5** Auto-login ถ้ามี stored key
- [ ] **3.2.6** ทดสอบ Login flow

### 3.3 Login UI

📁 **อ้างอิง:** `extension/src/App.jsx` บรรทัด 531-584

```jsx
// src/pages/Login.jsx
import { useState } from 'react';

export default function Login({ onLogin }) {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // Call Python to decode key
    const result = await window.electronAPI.decodeKey(keyInput);
    if (result.success) {
      onLogin(result.data);
    } else {
      setError('Invalid key format');
    }
  };

  return (
    <div className="login-container">
      <h1>Content Auto Post</h1>
      <input
        type="text"
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        placeholder="Paste User Key Here..."
      />
      <button onClick={handleLogin} disabled={!keyInput.trim()}>
        Connect Agent
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## Phase 4: Project Management UI

### 4.1 Projects List

📁 **อ้างอิง:** `extension/src/UserPanel.jsx` บรรทัด 190-280

### 4.2 Task Checklist

- [ ] **4.2.1** สร้าง `src/pages/Dashboard.jsx`
- [ ] **4.2.2** สร้าง `src/components/ProjectList.jsx`
- [ ] **4.2.3** สร้าง `src/components/ProjectCard.jsx`
- [ ] **4.2.4** Implement project selection
- [ ] **4.2.5** สร้าง `src/components/JobList.jsx` (แสดง Jobs)
- [ ] **4.2.6** สร้าง `src/components/BlockList.jsx` (แสดง Blocks)
- [ ] **4.2.7** Implement Lock Project ↔ Instance UI

### 4.3 UI Components

```jsx
// src/components/ProjectCard.jsx
// อ้างอิง: UserPanel.jsx บรรทัด 1048-1150

export default function ProjectCard({ project, isLocked, onSelect, onLock, onUnlock }) {
  return (
    <div className={`project-card ${isLocked ? 'locked' : ''}`}>
      <div className="project-info">
        <h3>{project.name}</h3>
        <span className={`status ${project.status}`}>{project.status}</span>
      </div>
      <div className="actions">
        {isLocked ? (
          <button onClick={onUnlock}>🔓 Unlock</button>
        ) : (
          <button onClick={onLock}>🔒 Lock to Instance</button>
        )}
        <button onClick={onSelect}>Select</button>
      </div>
    </div>
  );
}
```

---

## Phase 5: Playwright Player

### 5.1 Step Execution Engine

📁 **อ้างอิง:** `extension/src/content/player.js` บรรทัด 260-565

```python
# playwright/player.py

import asyncio
from playwright.async_api import async_playwright, Page
from typing import Dict, List, Any, Optional
import re

class PlaywrightPlayer:
    def __init__(self, profile_path: str, headless: bool = False):
        self.profile_path = profile_path
        self.headless = headless
        self.browser = None
        self.page = None
        self._pending_prompt = None
        self._scene_count_before = 0
    
    async def start(self):
        """Start browser with persistent context"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch_persistent_context(
            user_data_dir=self.profile_path,
            headless=self.headless,
            viewport={'width': 1280, 'height': 720}
        )
        self.page = self.browser.pages[0] if self.browser.pages else await self.browser.new_page()
    
    async def stop(self):
        """Stop browser"""
        if self.browser:
            await self.browser.close()
    
    async def find_element(self, selector: str, timeout: int = 15000):
        """
        Find element with custom selector support
        อ้างอิง: player.js บรรทัด 13-161
        """
        # Custom $scene:last selector
        if selector.startswith('$'):
            selector_without_dollar = selector[1:]
            
            if selector_without_dollar == 'scene:last':
                # Google Vids scene container
                locator = self.page.locator('[role="listitem"]').last
                await locator.wait_for(timeout=timeout)
                return locator
            
            elif ':last-child' in selector_without_dollar:
                parent_selector = selector_without_dollar.replace(':last-child', '').strip()
                locator = self.page.locator(f"{parent_selector} > *:last-child")
                await locator.wait_for(timeout=timeout)
                return locator
            
            elif ':last' in selector_without_dollar:
                base_selector = selector_without_dollar.replace(':last', '').strip()
                locator = self.page.locator(base_selector).last
                await locator.wait_for(timeout=timeout)
                return locator
        
        # Text-based selector
        if '::text=' in selector:
            parts = selector.split('::text=')
            tag = parts[0] or '*'
            text = parts[1].strip('"\'')
            locator = self.page.locator(f"{tag}:has-text('{text}')")
            await locator.wait_for(timeout=timeout)
            return locator
        
        # Standard CSS selector
        locator = self.page.locator(selector)
        await locator.wait_for(timeout=timeout)
        return locator
    
    async def execute_step(self, step: Dict, variables: Dict = None) -> bool:
        """
        Execute a single step
        อ้างอิง: player.js บรรทัด 386-565
        """
        variables = variables or {}
        action = step.get('action', '')
        selector = step.get('selector', '')
        
        print(f"🚀 Executing: {action} on {selector or 'N/A'}")
        
        try:
            await asyncio.sleep(0.5)  # Human-like delay
            
            # --- Special Actions (no element needed) ---
            if action == 'wait_for_element':
                timeout = step.get('timeout', 300000)
                await self.page.wait_for_selector(selector, timeout=timeout)
                return True
            
            if action == 'wait_for_disappear':
                timeout = step.get('timeout', 300000)
                await self.page.wait_for_selector(selector, state='hidden', timeout=timeout)
                return True
            
            if action == 'count_elements':
                count = await self.page.locator(selector).count()
                self._scene_count_before = count
                print(f"🔢 Count: {count}")
                return True
            
            if action == 'wait':
                duration = step.get('duration', step.get('value', 1000))
                await asyncio.sleep(duration / 1000)
                return True
            
            if action == 'loop_start':
                print("🔄 LOOP_START marker")
                return True
            
            if action == 'loop_end':
                print("🏁 LOOP_END marker")
                return {'loop_end': True}
            
            if action == 'inject_prompt':
                prompt = variables.get('prompt', variables.get('currentPrompt', ''))
                if prompt:
                    self._pending_prompt = prompt
                    print(f"📝 Prompt loaded: {prompt[:50]}...")
                return True
            
            if action == 'wait_for_progress_complete':
                timeout = step.get('timeout', 600000)
                start_time = asyncio.get_event_loop().time()
                
                while (asyncio.get_event_loop().time() - start_time) < (timeout / 1000):
                    try:
                        el = await self.page.query_selector(selector)
                        if not el:
                            print("✅ Progress completed")
                            return True
                        
                        text = await el.text_content()
                        if text and '100' in text:
                            print("✅ Progress reached 100%")
                            await asyncio.sleep(2)
                            return True
                    except:
                        pass
                    
                    await asyncio.sleep(2)
                
                return False
            
            # --- Check for modifiers ---
            if step.get('modifiers'):
                return await self.execute_step_with_modifiers(step, variables)
            
            # --- Standard Actions (need element) ---
            el = await self.find_element(selector)
            
            if action == 'click':
                await el.click()
                return True
            
            if action in ['type', 'input']:
                value = step.get('value', '')
                
                # Use pending prompt if {{prompt}}
                if value == '{{prompt}}' and self._pending_prompt:
                    value = self._pending_prompt
                    self._pending_prompt = None
                
                # Variable injection
                if '{{' in value:
                    for key, val in variables.items():
                        if isinstance(val, list):
                            val = ', '.join(str(v) for v in val)
                        elif val is None:
                            val = ''
                        value = value.replace(f'{{{{{key}}}}}', str(val))
                
                await el.fill(value)
                return True
            
            return True
            
        except Exception as e:
            print(f"❌ Step Failed: {e}")
            return False
    
    async def execute_step_with_modifiers(self, step: Dict, variables: Dict) -> bool:
        """
        Execute step with pre/post modifiers
        อ้างอิง: player.js บรรทัด 261-383
        """
        modifiers = step.get('modifiers', {})
        pre_actions = modifiers.get('preActions', [])
        post_actions = modifiers.get('postActions', [])
        
        # === PRE-ACTIONS ===
        for action in sorted(pre_actions, key=lambda x: x.get('order', 0)):
            action_type = action.get('type', '')
            print(f"   ▶️ PRE: {action_type}")
            
            if action_type == 'count_scenes':
                selector = action.get('selector', '[role="listitem"]')
                self._scene_count_before = await self.page.locator(selector).count()
            
            elif action_type == 'inject_prompt':
                prompt = variables.get('prompt', variables.get('currentPrompt', ''))
                if prompt:
                    self._pending_prompt = prompt
        
        # === MAIN ACTION ===
        try:
            el = await self.find_element(step['selector'])
            if step['action'] == 'click':
                await el.click()
        except Exception as e:
            print(f"   ❌ Main action failed: {e}")
            return False
        
        # === POST-ACTIONS ===
        for action in sorted(post_actions, key=lambda x: x.get('order', 0)):
            action_type = action.get('type', '')
            print(f"   ▶️ POST: {action_type}")
            
            if action_type == 'wait_progress':
                selector = action.get('selector', '.sc-dd6abb21-1')
                timeout = 600000
                start_time = asyncio.get_event_loop().time()
                
                while (asyncio.get_event_loop().time() - start_time) < (timeout / 1000):
                    el = await self.page.query_selector(selector)
                    if not el:
                        print("   ✅ Progress completed")
                        break
                    await asyncio.sleep(2)
            
            elif action_type == 'validate_scene':
                await asyncio.sleep(2)
                selector = action.get('selector', '[role="listitem"]')
                count_after = await self.page.locator(selector).count()
                if count_after > self._scene_count_before:
                    print(f"   ✅ Validation passed: {self._scene_count_before} → {count_after}")
                else:
                    print(f"   ❌ Validation failed")
                    return False
            
            elif action_type == 'wait_after':
                duration = action.get('duration', 5000)
                await asyncio.sleep(duration / 1000)
        
        return True
    
    async def execute_block(self, block: Dict, prompts: List[str]) -> bool:
        """
        Execute entire block with loop support
        อ้างอิง: player.js บรรทัด 700-783
        """
        steps = block.get('steps', [])
        has_loop = any(s.get('action') in ['loop_start', 'loop_end'] for s in steps)
        
        if has_loop and prompts:
            print(f"🔄 Executing block with {len(prompts)} prompts")
            
            loop_start_index = -1
            
            for prompt_index, prompt in enumerate(prompts):
                variables = {
                    'prompt': prompt,
                    'sceneIndex': prompt_index + 1,
                    'prompts': prompts
                }
                
                i = 0
                while i < len(steps):
                    step = steps[i]
                    
                    if step.get('action') == 'loop_start':
                        loop_start_index = i
                        i += 1
                        continue
                    
                    if step.get('action') == 'loop_end':
                        # Next prompt iteration will start from loop_start
                        break
                    
                    result = await self.execute_step(step, variables)
                    if not result:
                        print(f"❌ Step {i + 1} failed")
                        return False
                    
                    i += 1
                
                print(f"✅ Completed prompt {prompt_index + 1}/{len(prompts)}")
        
        else:
            # No loop - execute all steps once
            variables = {'prompt': prompts[0] if prompts else '', 'prompts': prompts}
            for i, step in enumerate(steps):
                result = await self.execute_step(step, variables)
                if not result:
                    print(f"❌ Step {i + 1} failed")
                    return False
        
        return True
```

### 5.2 Task Checklist

- [ ] **5.2.1** สร้าง `playwright/player.py`
- [ ] **5.2.2** Implement `find_element()` (จาก player.js)
  - [ ] Custom `$scene:last` selector
  - [ ] `::text=` selector
  - [ ] Standard CSS selector
- [ ] **5.2.3** Implement `execute_step()` (จาก player.js)
  - [ ] wait_for_element
  - [ ] wait_for_disappear
  - [ ] count_elements
  - [ ] wait
  - [ ] loop_start / loop_end
  - [ ] inject_prompt
  - [ ] wait_for_progress_complete
  - [ ] click
  - [ ] type / input
- [ ] **5.2.4** Implement `execute_step_with_modifiers()` (จาก player.js)
  - [ ] Pre-actions (count_scenes, inject_prompt)
  - [ ] Post-actions (wait_progress, validate_scene, wait_after)
- [ ] **5.2.5** Implement `execute_block()` with loop support
- [ ] **5.2.6** Variable injection (`{{prompt}}`, `{{sceneIndex}}`, etc.)
- [ ] **5.2.7** ทดสอบกับ Block จริง

---

## Phase 6: Playwright Recorder (Admin)

### 6.1 Playwright Codegen Integration

```python
# playwright/recorder.py

import subprocess
import json
from typing import List, Dict

class PlaywrightRecorder:
    def __init__(self):
        self.recorded_steps = []
    
    def start_codegen(self, url: str, output_file: str = "recorded_steps.json"):
        """
        Start Playwright codegen for recording
        User will record manually, then we parse the output
        """
        # Run codegen and save to file
        cmd = f"npx playwright codegen {url} --save-storage=auth.json"
        subprocess.run(cmd, shell=True)
    
    def parse_codegen_output(self, code: str) -> List[Dict]:
        """
        Parse Playwright codegen output to steps format
        """
        steps = []
        lines = code.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            
            # Parse click
            if '.click(' in line:
                match = re.search(r"\.click\(['\"](.+?)['\"]\)", line)
                if match:
                    steps.append({
                        'action': 'click',
                        'selector': match.group(1)
                    })
            
            # Parse fill
            elif '.fill(' in line:
                match = re.search(r"\.fill\(['\"](.+?)['\"],\s*['\"](.+?)['\"]\)", line)
                if match:
                    steps.append({
                        'action': 'type',
                        'selector': match.group(1),
                        'value': match.group(2)
                    })
            
            # Parse goto
            elif '.goto(' in line:
                match = re.search(r"\.goto\(['\"](.+?)['\"]\)", line)
                if match:
                    steps.append({
                        'action': 'navigate',
                        'url': match.group(1)
                    })
        
        return steps
    
    def add_modifier(self, step_index: int, modifier: Dict):
        """Add modifier to a step"""
        if step_index < len(self.recorded_steps):
            if 'modifiers' not in self.recorded_steps[step_index]:
                self.recorded_steps[step_index]['modifiers'] = {
                    'preActions': [],
                    'postActions': []
                }
            
            if modifier.get('type') == 'pre':
                self.recorded_steps[step_index]['modifiers']['preActions'].append(modifier)
            else:
                self.recorded_steps[step_index]['modifiers']['postActions'].append(modifier)
    
    def save_block(self, block_name: str, start_url: str) -> Dict:
        """Save recorded steps as a block"""
        return {
            'name': block_name,
            'type': 'ONCE',
            'startUrl': start_url,
            'variables': [],
            'steps': self.recorded_steps
        }
```

### 6.2 Task Checklist

- [ ] **6.2.1** สร้าง `playwright/recorder.py`
- [ ] **6.2.2** Implement Codegen launcher
- [ ] **6.2.3** Implement code parser → steps
- [ ] **6.2.4** สร้าง UI สำหรับ Add Modifiers (`src/components/ModifierEditor.jsx`)
  - [ ] อ้างอิง: `UserPanel.jsx` MODIFIER_OPTIONS (บรรทัด 439-449)
- [ ] **6.2.5** สร้าง UI สำหรับ Add Variables (`src/components/VariableEditor.jsx`)
  - [ ] อ้างอิง: `UserPanel.jsx` VARIABLE_OPTIONS (บรรทัด 452-463)
- [ ] **6.2.6** Implement save block to Firestore
- [ ] **6.2.7** ทดสอบ Record → Save → Run flow

---

## Phase 7: Multi-Instance Manager

### 7.1 Instance Manager

```python
# playwright/instance_manager.py

import asyncio
import json
from typing import Dict, List
from pathlib import Path
from player import PlaywrightPlayer
from firebase_client import FirebaseClient

class InstanceManager:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)
        self.instances: Dict[str, PlaywrightPlayer] = {}
        self.instance_states: Dict[str, Dict] = {}
        self.firebase = FirebaseClient()
        self._load_states()
    
    def _load_states(self):
        """Load instance states from file"""
        state_file = self.data_dir / "instances.json"
        if state_file.exists():
            with open(state_file) as f:
                self.instance_states = json.load(f)
    
    def _save_states(self):
        """Save instance states to file"""
        state_file = self.data_dir / "instances.json"
        with open(state_file, 'w') as f:
            json.dump(self.instance_states, f, indent=2)
    
    async def create_instance(self, instance_id: str, project: Dict, headless: bool = False):
        """Create and start a new Chrome instance"""
        profile_path = f"./profiles/{instance_id}"
        
        player = PlaywrightPlayer(profile_path, headless)
        await player.start()
        
        self.instances[instance_id] = player
        self.instance_states[instance_id] = {
            'projectId': project['id'],
            'projectName': project['name'],
            'userId': project['userId'],
            'status': 'running',
            'profile_path': profile_path
        }
        self._save_states()
        
        return player
    
    async def stop_instance(self, instance_id: str):
        """Stop a Chrome instance"""
        if instance_id in self.instances:
            await self.instances[instance_id].stop()
            del self.instances[instance_id]
            
            if instance_id in self.instance_states:
                self.instance_states[instance_id]['status'] = 'stopped'
                self._save_states()
    
    async def run_block_on_instance(self, instance_id: str, block_name: str):
        """Run a block on a specific instance"""
        if instance_id not in self.instances:
            print(f"❌ Instance {instance_id} not found")
            return False
        
        player = self.instances[instance_id]
        state = self.instance_states[instance_id]
        
        # Fetch block
        block = self.firebase.fetch_block(block_name)
        if not block:
            print(f"❌ Block {block_name} not found")
            return False
        
        # Fetch prompts
        prompts = self.firebase.fetch_prompts(state['userId'], state['projectId'])
        
        # Navigate to start URL if needed
        if block.get('startUrl'):
            await player.page.goto(block['startUrl'])
            await asyncio.sleep(2)
        
        # Execute block
        return await player.execute_block(block, prompts)
    
    async def run_all_instances(self, block_name: str):
        """Run block on all running instances simultaneously"""
        tasks = []
        for instance_id, state in self.instance_states.items():
            if state.get('status') == 'running' and instance_id in self.instances:
                task = self.run_block_on_instance(instance_id, block_name)
                tasks.append(task)
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return results
        return []
    
    def get_all_instances(self) -> List[Dict]:
        """Get all instance states"""
        return [
            {'id': k, **v}
            for k, v in self.instance_states.items()
        ]
```

### 7.2 Task Checklist

- [ ] **7.2.1** สร้าง `playwright/instance_manager.py`
- [ ] **7.2.2** Implement `create_instance()` with persistent profile
- [ ] **7.2.3** Implement `stop_instance()`
- [ ] **7.2.4** Implement `run_block_on_instance()`
- [ ] **7.2.5** Implement `run_all_instances()` (parallel execution)
- [ ] **7.2.6** สร้าง UI สำหรับ Instance Management (`src/components/InstanceManager.jsx`)
- [ ] **7.2.7** ทดสอบ Multi-instance execution

---

## Phase 8: Scheduler & Auto-Run

### 8.1 Job Scheduler

📁 **อ้างอิง:** `extension/src/background/index.js` บรรทัด 1200-1230

```python
# playwright/scheduler.py

import asyncio
from datetime import datetime
from typing import Callable
from firebase_client import FirebaseClient
from instance_manager import InstanceManager

class JobScheduler:
    def __init__(self, instance_manager: InstanceManager):
        self.instance_manager = instance_manager
        self.firebase = FirebaseClient()
        self.running = False
        self.check_interval = 30  # seconds
    
    async def start(self):
        """Start scheduler loop"""
        self.running = True
        print("🕐 Scheduler started")
        
        while self.running:
            await self.check_jobs()
            await asyncio.sleep(self.check_interval)
    
    def stop(self):
        """Stop scheduler"""
        self.running = False
        print("🕐 Scheduler stopped")
    
    async def check_jobs(self):
        """Check for pending jobs in all locked projects"""
        # อ้างอิง: background/index.js บรรทัด 1210-1230
        instances = self.instance_manager.get_all_instances()
        processed_projects = set()
        
        for instance in instances:
            if instance.get('status') != 'running':
                continue
            
            project_id = instance.get('projectId')
            user_id = instance.get('userId')
            
            if not project_id or project_id in processed_projects:
                continue
            
            processed_projects.add(project_id)
            
            # Check for pending jobs
            jobs = self.firebase.fetch_jobs(user_id, project_id, status='PENDING')
            
            for job in jobs:
                scheduled_time = job.get('scheduledTime')
                if scheduled_time and self._is_time_to_run(scheduled_time):
                    print(f"🚀 Running job {job['id']} for project {project_id}")
                    await self.run_job(instance['id'], job)
    
    def _is_time_to_run(self, scheduled_time: str) -> bool:
        """Check if scheduled time has passed"""
        try:
            scheduled = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
            return datetime.now(scheduled.tzinfo) >= scheduled
        except:
            return False
    
    async def run_job(self, instance_id: str, job: dict):
        """Run a specific job"""
        block_name = job.get('blockName', 'ADD_SCENE_TEXT')
        await self.instance_manager.run_block_on_instance(instance_id, block_name)
```

### 8.2 Task Checklist

- [ ] **8.2.1** สร้าง `playwright/scheduler.py`
- [ ] **8.2.2** Implement `check_jobs()` (จาก background/index.js)
- [ ] **8.2.3** Implement `run_job()`
- [ ] **8.2.4** สร้าง UI สำหรับ Scheduler status (`src/components/SchedulerStatus.jsx`)
- [ ] **8.2.5** ทดสอบ Auto-run jobs

---

## Phase 9: Testing & Polish

### 9.1 Task Checklist

- [ ] **9.1.1** End-to-end test: Login → Select Project → Lock Instance → Run Block
- [ ] **9.1.2** Test multi-instance (3+ Chrome พร้อมกัน)
- [ ] **9.1.3** Test scheduler with scheduled jobs
- [ ] **9.1.4** Test Admin: Record → Save Block → Run
- [ ] **9.1.5** Test error handling & recovery
- [ ] **9.1.6** Polish UI (loading states, error messages)
- [ ] **9.1.7** Build Electron app for Windows
- [ ] **9.1.8** Create installer

---

## 📊 สรุป Timeline

| Phase | เวลาประมาณ | หมายเหตุ |
|-------|-----------|----------|
| Phase 1: Setup | 30 นาที | โครงสร้างโปรเจค |
| Phase 2: Firebase | 1 ชม. | REST API client |
| Phase 3: Auth | 30 นาที | Key decode + Login UI |
| Phase 4: Project UI | 1 ชม. | Dashboard + Project list |
| Phase 5: Player | 2 ชม. | Step execution engine |
| Phase 6: Recorder | 1.5 ชม. | Admin recording |
| Phase 7: Multi-Instance | 1 ชม. | Parallel execution |
| Phase 8: Scheduler | 30 นาที | Auto-run jobs |
| Phase 9: Testing | 1 ชม. | E2E testing |

**รวม: ~9 ชั่วโมง**

---

## ✅ Next Step

เมื่อพร้อม พิมพ์ `เริ่ม Phase 1` เพื่อเริ่มสร้างโครงสร้างโปรเจค
