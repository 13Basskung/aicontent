# 📖 Walkthrough: Desktop App for Content Auto Post

> เอกสารนี้อธิบายการทำงานของ **Desktop App** ที่จะแทนที่ Chrome Extension
> วิเคราะห์จากโค้ดโปรเจคปัจจุบันเพื่อให้เข้าใจการเชื่อมโยงและความเป็นไปได้

---

## 📌 สารบัญ

1. [ภาพรวมระบบ (System Overview)](#1-ภาพรวมระบบ)
2. [ปัญหาของ Extension ปัจจุบัน](#2-ปัญหาของ-extension-ปัจจุบัน)
3. [ทำไมต้อง Desktop App](#3-ทำไมต้อง-desktop-app)
4. [Architecture ใหม่](#4-architecture-ใหม่)
5. [Firebase Structure (จากโค้ดจริง)](#5-firebase-structure)
6. [Key-based Authentication](#6-key-based-authentication)
7. [Project Lock System](#7-project-lock-system)
8. [Block & Step Execution](#8-block--step-execution)
9. [Modifiers & Variables](#9-modifiers--variables)
10. [Playwright vs Extension Player](#10-playwright-vs-extension-player)
11. [Multi-Chrome Instance](#11-multi-chrome-instance)

---

## 1. ภาพรวมระบบ

### 🎯 เป้าหมาย

สร้าง **Desktop Application** ที่:
- ✅ ใช้งานง่ายกว่า Extension (ไม่ต้องเปิด popup ค้าง)
- ✅ เสถียรกว่า (ไม่มี event conflict)
- ✅ รองรับหลาย Chrome พร้อมกัน (Playwright multi-instance)
- ✅ ใช้ Firebase/Firestore เดิมได้ 100%
- ✅ ใช้ Key-based Auth เดิมได้ 100%

### 🏗️ Stack ที่จะใช้

| Component | Technology | เหตุผล |
|-----------|------------|--------|
| **UI Framework** | Electron + React | Cross-platform, ใช้ React ที่มีอยู่ |
| **Browser Automation** | Playwright (Python) | เสถียร, headless ได้, multi-instance |
| **Database** | Firebase Firestore | ใช้เดิม ไม่ต้องเปลี่ยน |
| **Auth** | Key-based (base64) | ใช้เดิม ไม่ต้องเปลี่ยน |

---

## 2. ปัญหาของ Extension ปัจจุบัน

### 📁 ไฟล์ที่เกี่ยวข้อง:
- `extension/src/App.jsx` - หน้า Login/Admin Mode
- `extension/src/UserPanel.jsx` - หน้า User Mode
- `extension/src/background/index.js` - Background Worker
- `extension/src/content/player.js` - Step Execution
- `extension/src/content/recorder.js` - Step Recording

### ❌ ปัญหาที่พบ:

| ปัญหา | สาเหตุ | ผลกระทบ |
|-------|--------|---------|
| Popup ปิดแล้วหาย | Chrome Extension Architecture | ต้องเปิดค้างตลอด |
| Event Conflict | Content Script vs Page Events | Dropdown ไม่ record |
| เปิด Tab ซ้ำ | URL Matching Logic | Tab เยอะเกินไป |
| Modifier Modal ไม่เด้ง | Storage Listener Issues | ตั้งค่าไม่ได้ |
| ไม่เสถียร | หลายปัจจัย | UX แย่ |

---

## 3. ทำไมต้อง Desktop App

### ✅ ข้อดี:

| หัวข้อ | Extension | Desktop App |
|--------|-----------|-------------|
| **ต้องเปิด popup?** | ✅ ต้อง | ❌ ไม่ต้อง |
| **ปิดแล้วหาย?** | ✅ ใช่ | ❌ ไม่ |
| **หลาย Chrome พร้อมกัน?** | ❌ ไม่ได้ | ✅ ได้ |
| **Headless (ทำงานเงียบๆ)?** | ❌ ไม่ได้ | ✅ ได้ |
| **เสถียร?** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 4. Architecture ใหม่

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT AUTO POST                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────┐         ┌───────────────────┐            │
│  │  🌐 Web App        │         │  🖥️ Desktop App    │ ← ใหม่!   │
│  │  (Antigravity)    │         │  (Electron)       │            │
│  │                   │         │                   │            │
│  │  - Dashboard      │         │  - Login (Key)    │            │
│  │  - Projects       │         │  - Projects       │            │
│  │  - Generate Key   │         │  - Record (Admin) │            │
│  │  - Prompts        │         │  - Run Blocks     │            │
│  └─────────┬─────────┘         │  - Multi-Chrome   │            │
│            │                   └─────────┬─────────┘            │
│            │                             │                       │
│            └──────────┬──────────────────┘                       │
│                       ▼                                          │
│              ┌──────────────────┐                                │
│              │  ☁️ Firebase      │                                │
│              │  (Firestore)     │                                │
│              └────────┬─────────┘                                │
│                       │                                          │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  🎭 Playwright (Python)                                     ││
│  │  - Chrome Instance 1 → Project A                            ││
│  │  - Chrome Instance 2 → Project B                            ││
│  │  - Chrome Instance 3 → Project C                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Firebase Structure

### 📁 จากโค้ดจริง (`firestore.rules`):

```
/users/{userId}
├── /projects/{projectId}           ← Projects ของ User
│   ├── /jobs/{jobId}               ← Jobs with prompts
│   ├── /readyPrompts/{docId}       ← Ready prompts for execution
│   ├── /episodes/{episodeId}       ← Episode queue
│   └── /episodeHistory/{historyId} ← Used episodes
│
/global_recipe_blocks/{blockId}     ← Blocks (steps) - Global
/recipe_templates/{templateId}      ← Templates - Global
/agent_jobs/{jobId}                 ← Agent job queue
/settings/{docId}                   ← App settings
```

### 📝 Block Structure (จาก `background/index.js`):

```javascript
// global_recipe_blocks/{blockId}
{
  name: "ADD_SCENE_TEXT",           // Block name
  type: "ONCE",                     // ONCE | LOOP
  category: "create",               // Category
  purpose: "ADD_SCENE_TEXT",        // Purpose
  startUrl: "https://...",          // Starting URL
  variables: ["prompt"],            // Required variables
  steps: [                          // Steps array
    {
      action: "click",
      selector: "button#create",
      modifiers: {
        preActions: [...],
        postActions: [...]
      }
    }
  ]
}
```

### 📝 Job Structure (จาก `background/index.js`):

```javascript
// users/{userId}/projects/{projectId}/jobs/{jobId}
{
  prompts: ["prompt1", "prompt2", ...],   // Prompts array
  status: "PENDING" | "RUNNING" | "COMPLETED",
  createdAt: timestamp,
  scheduledTime: timestamp
}

// users/{userId}/projects/{projectId}/readyPrompts/{docId}
{
  prompts: [
    { englishPrompt: "...", audioDescription: "..." },
    ...
  ],
  titles: { youtube: "...", tiktok: "...", ... },
  tags: { youtube: [...], tiktok: [...], ... }
}
```

---

## 6. Key-based Authentication

### 📁 จากโค้ดจริง (`App.jsx` บรรทัด 38-52):

```javascript
// Key Format: base64(userId:ROLE:timestamp:random)
// ตัวอย่าง: "dXNlcjEyMzpBRE1JTjoxNzA2NjQ4MDAwOnJhbmQ="

const decodeKey = (key) => {
  try {
    const decoded = atob(key);           // base64 decode
    const parts = decoded.split(':');    // แยกด้วย :
    if (parts.length >= 2) {
      return {
        userId: parts[0],                // User ID
        isAdmin: parts[1] === 'ADMIN'    // Admin or User
      };
    }
    return null;
  } catch {
    return null;
  }
};
```

### 🔑 Key Types:

| Key Type | ตัวอย่าง Decoded | isAdmin |
|----------|------------------|---------|
| ADMIN | `user123:ADMIN:1706648000:rand` | true |
| USER | `user123:USER:1706648000:rand` | false |

### ✅ สิทธิ์ตาม Role (จาก `UserPanel.jsx`):

| ฟังก์ชัน | Admin | User |
|----------|-------|------|
| Record Steps | ✅ | ❌ |
| สร้าง/แก้ไข Blocks | ✅ | ❌ |
| สร้าง Templates | ✅ | ❌ |
| AI Block Editor | ✅ | ❌ |
| รัน Blocks | ✅ | ✅ |
| เลือก Project | ✅ | ✅ |
| Lock Project ↔ Chrome | ✅ | ✅ |
| ดู Jobs/Status | ✅ | ✅ |

---

## 7. Project Lock System

### 📁 จากโค้ดจริง (`UserPanel.jsx` บรรทัด 78-140):

```javascript
// Storage Structure
chrome.storage.local = {
  windowProjects: {
    "12345": {                    // windowId
      projectId: "proj_abc",
      projectName: "Google Vids TH",
      windowId: 12345,
      windowName: "Chrome #12345",
      lockedAt: 1706648000000
    },
    "67890": {                    // อีก windowId
      projectId: "proj_xyz",
      projectName: "YouTube Shorts",
      ...
    }
  },
  activeUserId_12345: "user123",
  activeUserId_67890: "user123"
};
```

### 🔄 สำหรับ Desktop App:

เปลี่ยนจาก `windowId` → `instanceId` (Playwright instance)

```python
# Desktop App Storage (JSON file)
{
  "instances": {
    "instance_1": {
      "projectId": "proj_abc",
      "projectName": "Google Vids TH",
      "status": "running",
      "profile_path": "./profiles/instance_1"
    },
    "instance_2": {
      "projectId": "proj_xyz",
      "projectName": "YouTube Shorts",
      "status": "running",
      "profile_path": "./profiles/instance_2"
    }
  }
}
```

---

## 8. Block & Step Execution

### 📁 จากโค้ดจริง (`player.js`):

### 8.1 Find Element (บรรทัด 13-161):

```javascript
const findElement = async (selector, timeout = 15000) => {
  // รองรับ Custom Selectors:
  
  // 1. $scene:last - เลือกฉากสุดท้าย
  // 2. $parent_selector:last-child
  // 3. $parent_selector:nth-child(n)
  // 4. tag::text="value" - XPath text match
  // 5. Standard CSS Selector
  
  // Wait loop จน element เจอหรือ timeout
};
```

### 8.2 Execute Step (บรรทัด 386-565):

```javascript
const executeStep = async (step, variables = {}) => {
  // Special Actions (no element):
  // - wait_for_element
  // - wait_for_disappear
  // - count_elements
  // - wait
  // - loop_start
  // - loop_end
  // - inject_prompt
  // - wait_for_progress_complete
  // - wait_for_element_and_click
  
  // Standard Actions:
  // - click
  // - type / input (รองรับ file upload)
};
```

### 8.3 Variable Injection (บรรทัด 531-552):

```javascript
// รองรับ Variables:
// {{prompt}} - Prompt จาก Firebase
// {{sceneIndex}} - Index ปัจจุบันใน loop
// {{title_youtube}}, {{title_tiktok}}, etc.
// {{tags_youtube}}, {{tags_tiktok}}, etc.

if (textToType.includes('{{')) {
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    textToType = textToType.replace(regex, String(variables[key]));
  });
}
```

---

## 9. Modifiers & Variables

### 📁 จากโค้ดจริง (`UserPanel.jsx` บรรทัด 439-463):

### 9.1 MODIFIER_OPTIONS:

```javascript
const MODIFIER_OPTIONS = [
  { id: 'wait_progress', icon: '⏳', label: 'รอ%', type: 'post', selector: '.sc-dd6abb21-1' },
  { id: 'count_scenes', icon: '🔢', label: 'นับฉาก', type: 'pre', selector: '[role="listitem"]' },
  { id: 'validate_scene', icon: '✅', label: 'ยืนยัน', type: 'post', selector: '[role="listitem"]' },
  { id: 'retry_on_fail', icon: '🔄', label: 'ซ้ำ', type: 'post', maxRetries: 3 },
  { id: 'inject_prompt', icon: '📝', label: 'Prompt', type: 'pre' },
  { id: 'type_prompt', icon: '⌨️', label: 'พิมพ์', type: 'post' },
  { id: 'wait_after', icon: '⏱️', label: 'รอหลัง', type: 'post', hasInput: true },
  { id: 'loop_start', icon: '🔁', label: 'เริ่มวน', type: 'standalone' },
  { id: 'loop_end', icon: '🏁', label: 'จบวน', type: 'standalone' }
];
```

### 9.2 VARIABLE_OPTIONS:

```javascript
const VARIABLE_OPTIONS = [
  { id: 'prompt', label: '{{prompt}}', color: 'green' },
  { id: 'sceneIndex', label: '{{sceneIndex}}', color: 'pink' },
  { id: 'title_youtube', label: 'YT Title', color: 'red' },
  { id: 'title_tiktok', label: 'TT Title', color: 'cyan' },
  { id: 'title_facebook', label: 'FB Title', color: 'blue' },
  { id: 'title_instagram', label: 'IG Title', color: 'pink' },
  { id: 'tags_youtube', label: 'YT Tags', color: 'red' },
  { id: 'tags_tiktok', label: 'TT Tags', color: 'cyan' },
  { id: 'tags_facebook', label: 'FB Tags', color: 'blue' },
  { id: 'tags_instagram', label: 'IG Tags', color: 'pink' }
];
```

---

## 10. Playwright vs Extension Player

### 📊 Mapping Extension player.js → Playwright:

| Extension (player.js) | Playwright (Python) |
|-----------------------|---------------------|
| `findElement(selector)` | `page.locator(selector)` |
| `el.click()` | `page.click(selector)` |
| `el.value = text` | `page.fill(selector, text)` |
| `waitForElement()` | `page.wait_for_selector()` |
| `waitForDisappear()` | `page.wait_for_selector(state='hidden')` |
| `countElements()` | `page.locator(selector).count()` |
| `sleep(ms)` | `await asyncio.sleep(ms/1000)` |
| `text=` selector | `page.get_by_text()` |
| Custom `$scene:last` | `page.locator('[role="listitem"]').last` |

### 📝 ตัวอย่าง Playwright Code:

```python
from playwright.async_api import async_playwright

async def execute_step(page, step, variables):
    selector = step['selector']
    action = step['action']
    
    if action == 'click':
        await page.click(selector)
    
    elif action == 'type':
        value = step['value']
        # Variable injection
        for key, val in variables.items():
            value = value.replace(f'{{{{{key}}}}}', str(val))
        await page.fill(selector, value)
    
    elif action == 'wait_for_disappear':
        await page.wait_for_selector(selector, state='hidden', timeout=300000)
    
    elif action == 'wait':
        await asyncio.sleep(step.get('duration', 1000) / 1000)
```

---

## 11. Multi-Chrome Instance

### 📐 Playwright Persistent Context:

```python
async def create_chrome_instance(instance_id, project):
    profile_path = f"./profiles/{instance_id}"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=profile_path,  # เก็บ login state
            headless=False,              # True = ทำงานเงียบๆ
            viewport={'width': 1280, 'height': 720}
        )
        
        page = browser.pages[0]
        
        # ดึง Block จาก Firebase
        block = await fetch_block(project['blockName'])
        
        # ดึง Prompts จาก Firebase
        prompts = await fetch_prompts(project['userId'], project['projectId'])
        
        # รัน Steps
        for prompt in prompts:
            for step in block['steps']:
                await execute_step(page, step, {'prompt': prompt})
        
        await browser.close()
```

### 📊 Multi-Instance Management:

```python
import asyncio

async def run_multiple_projects(instances):
    tasks = []
    for instance in instances:
        task = create_chrome_instance(instance['id'], instance['project'])
        tasks.append(task)
    
    # รันทั้งหมดพร้อมกัน!
    await asyncio.gather(*tasks)
```

---

## ✅ สรุป

### สิ่งที่ใช้ได้จากโค้ดเดิม 100%:

| Component | ใช้เดิม | หมายเหตุ |
|-----------|--------|----------|
| Firebase Structure | ✅ | ไม่ต้องเปลี่ยน |
| Key-based Auth | ✅ | decode base64 เหมือนเดิม |
| Block Structure | ✅ | steps, modifiers, variables |
| Modifier Options | ✅ | copy มาใช้ได้เลย |
| Variable Options | ✅ | copy มาใช้ได้เลย |
| API Endpoints | ✅ | Firestore REST API เดิม |

### สิ่งที่ต้องสร้างใหม่:

| Component | ใหม่ | เหตุผล |
|-----------|-----|--------|
| UI (Electron) | ✅ | แทน Extension popup |
| Player (Playwright) | ✅ | แทน content/player.js |
| Recorder (Playwright Codegen) | ✅ | แทน content/recorder.js |
| Instance Manager | ✅ | Multi-Chrome support |

---

**พร้อมดู Task.md สำหรับขั้นตอนการ Implement!**
