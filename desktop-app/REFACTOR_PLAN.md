# 🔧 Refactor Plan - Desktop Agent v1.6.89

แผนการแก้ไขปัญหา 6 ข้อ แบ่งเป็น 6 Phase ทำทีละข้ออย่างละเอียด
เรียงตามความเสี่ยง: พังก่อน → แก้ก่อน

---

## Phase 1: แก้ `saveBlockToFirestore` ที่จะ crash ทันที

### 🔍 ปัญหา
ฟังก์ชัน `saveBlockToFirestore` ในไฟล์ `scheduler.js` บรรทัด 916-925 ใช้ตัวแปร `db` ที่ไม่เคยถูกสร้าง

### 📄 โค้ดที่มีปัญหา
```javascript
// scheduler.js บรรทัด 916-925
async function saveBlockToFirestore(userId, blockId, data) {
  try {
    const blockRef = db.collection('users').doc(userId).collection('blocks').doc(blockId);
    //                ^^^ db ไม่มี! ไม่เคย import หรือ initialize
    await blockRef.set(data, { merge: true });
  } catch (error) {
    throw error;
  }
}
```

### 📄 ไฟล์ที่เรียกใช้ (จะได้รับผลกระทบ)
1. **`main.js` บรรทัด 211-220** - IPC handler `store:save-block-firestore`
   ```javascript
   ipcMain.handle('store:save-block-firestore', async (event, { userId, blockId, data }) => {
     const { saveBlockToFirestore } = require('./scheduler');
     await saveBlockToFirestore(userId, blockId, data);  // ❌ จะ crash
   });
   ```
2. **`preload.js` บรรทัด 10** - expose ให้ Frontend
   ```javascript
   saveBlockToFirestore: (userId, blockId, data) => ipcRenderer.invoke('store:save-block-firestore', ...)
   ```
3. **`Dashboard.jsx` บรรทัด 954** - เรียกจาก Debug Selector "Shoot to Block"
   ```javascript
   await window.electronAPI.store.saveBlockToFirestore(keyData?.userId, blockId, updatedBlock);
   ```

### ✅ วิธีแก้ไข
เปลี่ยนจากใช้ `db.collection()` (Firebase Admin SDK ที่ไม่มี) เป็นใช้ REST API เหมือนฟังก์ชันอื่นๆ ในไฟล์เดียวกัน (เช่น `saveExecutionLogFromScheduler`)

### 📝 ขั้นตอน
1. เขียน `saveBlockToFirestore` ใหม่ให้ใช้ REST API (`https` module + `postJSON`)
2. ทดสอบว่า Dashboard.jsx เรียก "Shoot to Block" ได้โดยไม่ crash
3. ไม่แก้ไฟล์อื่น (main.js, preload.js, Dashboard.jsx ยังเรียกเหมือนเดิม)

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- **main.js** `store:save-block-firestore` handler → ไม่ต้องแก้ (เรียก function เดิม)
- **preload.js** → ไม่ต้องแก้
- **Dashboard.jsx** → ไม่ต้องแก้

### 🏷️ สถานะ: ⬜ ยังไม่เริ่ม

---

## Phase 2: แก้ Debug Selector ใช้ relative path (ไม่จำ Login)

### 🔍 ปัญหา
Debug Selector ใน `playwright-bridge.js` บรรทัด 411 ใช้ `process.cwd()` (relative path) แทนที่จะใช้ `app.getPath('userData')` เหมือน Instance และ Recorder

### 📄 โค้ดที่มีปัญหา
```javascript
// playwright-bridge.js บรรทัด 411
const profilePath = path.join(process.cwd(), 'profiles', 'debug-selector');
// ❌ ไปอยู่ใน Program Files → ล็อกอินแล้วหาย
```

### 📄 เปรียบเทียบกับโค้ดที่ถูกต้อง
| ส่วน | Path | ถูก/ผิด |
|------|------|---------|
| Instance (playwright-bridge.js:56) | `path.join(getProfilesDir(), instanceId)` | ✅ |
| Recorder (recorder.js:53) | `path.join(getRecorderProfilesDir(), profileName)` | ✅ |
| Debug Selector (playwright-bridge.js:411) | `path.join(process.cwd(), 'profiles', ...)` | ❌ |

### ✅ วิธีแก้ไข
เปลี่ยนให้ Debug Selector ใช้ `getProfilesDir()` ที่มีอยู่แล้วในไฟล์เดียวกัน + เพิ่ม viewport/args ให้เหมือน Instance

### 📝 ขั้นตอน
1. เปลี่ยน `path.join(process.cwd(), 'profiles', 'debug-selector')` → `path.join(getProfilesDir(), 'debug-selector')`
2. เพิ่ม `deviceScaleFactor: undefined` + args เหมือน Instance
3. ทดสอบว่า Debug Selector จำ Login ข้ามครั้ง

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- แก้เฉพาะ `playwright-bridge.js` → ไม่กระทบไฟล์อื่น
- Profile จะย้ายจาก `./profiles/debug-selector` ไป `AppData/.../browser-profiles/debug-selector`
- **User ต้อง Login ใหม่ครั้งแรก** หลังอัพเดท (เพราะ profile ย้าย)

### 🏷️ สถานะ: ⬜ ยังไม่เริ่ม

---

## Phase 3: แก้ `saveUserTimezone` ที่ใช้ `fetch()` ใน Node.js

### 🔍 ปัญหา
ฟังก์ชัน `saveUserTimezone` ใน `scheduler.js` บรรทัด 352 ใช้ `fetch()` ซึ่งอาจไม่มีใน Node.js ของ Electron 28 (บางรุ่น)
ทุกฟังก์ชันอื่นในไฟล์นี้ใช้ `https` module + `fetchJSON`/`postJSON` helper

### 📄 โค้ดที่มีปัญหา
```javascript
// scheduler.js บรรทัด 339-373
async function saveUserTimezone(userId, timezone) {
  // ... ใช้ fetchJSON (https module) ✅
  const projectsData = await fetchJSON(projectsUrl);
  
  // ... แต่ตรงนี้ใช้ fetch() ❌
  const response = await fetch(updateUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... })
  });
  
  if (response.ok) { ... }  // ❌ response.ok เป็น Web API
}
```

### 📄 เปรียบเทียบกับฟังก์ชันอื่นในไฟล์เดียวกัน
| ฟังก์ชัน | ใช้อะไร | ถูก/ผิด |
|----------|--------|---------|
| `fetchJSON` | `https.get` | ✅ |
| `postJSON` | `https.request` | ✅ |
| `fetchReadyPrompts` | `fetchJSON` | ✅ |
| `saveExecutionLogFromScheduler` | `https.request` | ✅ |
| **`saveUserTimezone`** | **`fetch()`** | **❌** |

### ✅ วิธีแก้ไข
เปลี่ยนจาก `fetch()` เป็นใช้ `https.request` helper ให้เหมือนฟังก์ชันอื่นในไฟล์

### 📝 ขั้นตอน
1. สร้าง helper function `patchJSON(url, body)` (หรือใช้ `https.request` โดยตรง)
2. แก้ `saveUserTimezone` ให้ใช้ `patchJSON` แทน `fetch`
3. ทดสอบว่าเปลี่ยน Timezone ใน UI แล้วบันทึกได้

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- แก้เฉพาะ `scheduler.js` → ไม่กระทบไฟล์อื่น
- **main.js** `scheduler:set-timezone` handler เรียก `saveUserTimezone` → ทำงานเหมือนเดิม
- **SchedulerPanel.jsx** → ไม่ต้องแก้

### 🏷️ สถานะ: ⬜ ยังไม่เริ่ม

---

## Phase 4: แก้ Memory Leak จาก `ipcRenderer.on` ไม่มี cleanup

### 🔍 ปัญหา
`preload.js` ใช้ `ipcRenderer.on()` เพื่อรับ event จาก main process แต่ไม่มีวิธี remove listener
ทุกครั้งที่ Component mount ใหม่ (เช่น เปลี่ยน tab) จะเพิ่ม listener ซ้ำไปเรื่อยๆ

### 📄 โค้ดที่มีปัญหา (preload.js)
10 จุดที่ใช้ `ipcRenderer.on`:
```
บรรทัด 20:  ipcRenderer.on('update-status', ...)
บรรทัด 25:  ipcRenderer.on('google-login-reminder', ...)
บรรทัด 50:  ipcRenderer.on('playwright:status', ...)
บรรทัด 73:  ipcRenderer.on('scheduler:trigger', ...)
บรรทัด 76:  ipcRenderer.on('scheduler:update', ...)
บรรทัด 79:  ipcRenderer.on('scheduler:status', ...)
บรรทัด 82:  ipcRenderer.on('scheduler:auto-started', ...)
บรรทัด 94:  ipcRenderer.on('recorder:started', ...)
บรรทัด 97:  ipcRenderer.on('recorder:stopped', ...)
บรรทัด 100: ipcRenderer.on('recorder:step', ...)
```

### 📄 Frontend ที่เรียกใช้จริง (ตรวจแล้ว)
- **App.jsx** บรรทัด 38: `window.electronAPI.onUpdateStatus(...)` (ใน useEffect, ไม่มี cleanup)
- **App.jsx** บรรทัด 47: `window.electronAPI.onGoogleLoginReminder(...)` (ใน useEffect, ไม่มี cleanup)
- **SchedulerPanel.jsx** บรรทัด 149-168: `onTrigger`, `onUpdate`, `onStatus`, `onAutoStarted` (ใน useEffect, ไม่มี cleanup)
- **RecorderPanel.jsx** บรรทัด 268-281: `onStarted`, `onStopped`, `onStep` (ใน useEffect, ไม่มี cleanup)
- ~~**Dashboard.jsx**~~ → ❌ **ไม่มี listener เลย** (ตรวจแล้ว)

> ⚠️ **หมายเหตุ:** `onInstanceStatus` (preload.js บรรทัด 49-51) ถูก define ไว้ แต่ไม่มี component ใดเรียกใช้ → เป็น **Dead Code**

### ✅ วิธีแก้ไข
เปลี่ยน pattern ใน `preload.js` ให้:
1. ลบ listener เก่าก่อน add ใหม่ (`ipcRenderer.removeAllListeners` ก่อน `on`)
2. เพิ่มฟังก์ชัน `removeListener` ให้ Frontend เรียก cleanup ได้

### 📝 ขั้นตอน
1. แก้ `preload.js` ทุก `on` callback ให้ `removeAllListeners` ก่อน
2. ตรวจสอบว่า Frontend component ทุกตัวยังทำงานปกติ
3. (Optional) เพิ่ม cleanup function ให้ Frontend ใช้ `useEffect cleanup`

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- **preload.js** → แก้ไข 10 จุด (เพิ่ม `removeAllListeners` ก่อน `on`)
- **App.jsx** → ควรเพิ่ม cleanup ใน useEffect (ไม่จำเป็นแต่ดีกว่า)
- **SchedulerPanel.jsx** → ควรเพิ่ม cleanup ใน useEffect
- **RecorderPanel.jsx** → ควรเพิ่ม cleanup ใน useEffect
- ~~**Dashboard.jsx**~~ → ❌ ไม่มี listener (ไม่ต้องแก้)

### 🏷️ สถานะ: ⬜ ยังไม่เริ่ม

---

## Phase 5: รวมโค้ดซ้ำกัน 400+ บรรทัด

### 🔍 ปัญหา
`playwright-bridge.js` มีโค้ดซ้ำกัน 2 ชุด:

#### ชุด A: Launch Browser (~100 บรรทัดซ้ำ)
| IPC Handler (UI กดปุ่ม) | Direct Function (Scheduler เรียก) |
|--------------------------|----------------------------------|
| บรรทัด 50-156 (`playwright:launch`) | บรรทัด 1004-1120 (`launchInstance`) |

#### ชุด B: Run Block (~300 บรรทัดซ้ำ)
| IPC Handler (UI กดปุ่ม) | Direct Function (Scheduler เรียก) |
|--------------------------|----------------------------------|
| บรรทัด 182-353 (`playwright:run-block`) | บรรทัด 1126-1293 (`runBlock`) |

### 📄 ความแตกต่างระหว่าง 2 ชุด (ตรวจแล้วทุกบรรทัด)

**ชุด A: Launch Browser**
| จุดต่าง | IPC Handler (50-156) | Direct `launchInstance` (1004-1120) |
|---------|-------------|-----------------|
| Check instance exists | ไม่มี | มี `instances.has()` → reuse ถ้ามีอยู่แล้ว |
| Navigate about:blank | `page.evaluate(() => window.location.href = 'about:blank')` | `page.goto('about:blank', { timeout: 5000 })` |
| mainWindow reference | ใช้ `mainWindow` (parameter จาก closure) | ใช้ `storedMainWindow` (global) + null check |

**ชุด B: Run Block**
| จุดต่าง | IPC Handler (182-353) | Direct `runBlock` (1126-1293) |
|---------|-------------|-----------------|
| Navigate startUrl | `page.goto(block.startUrl, { waitUntil, timeout: 30000 })` | `page.evaluate((url) => window.location.href = url)` + `waitForLoadState` |
| Debug logging | มี variables preview log (บรรทัด 265-270) | มี instances Map debug log (บรรทัด 1130-1133) |
| Pre-loop error return | `{ success: false, results, error }` | `{ success: false, results, error, currentStep, failedStep }` |
| Normal mode error | `break` (ไม่ return ทันที) | `return { success: false, results, error, currentStep, failedStep }` |
| Success return | `{ success: true, results }` | `{ success: true, results, currentStep: steps.length }` |
| mainWindow reference | ใช้ `mainWindow` (parameter จาก closure) | ใช้ `storedMainWindow` (global) |

> ⚠️ **สำคัญ:** เมื่อรวมโค้ด ต้องตัดสินใจว่าจะใช้ behavior ของฝั่งไหน — แนะนำใช้ Direct Function เป็นหลัก (มี error info ครบกว่า)

### ✅ วิธีแก้ไข
1. สร้าง **1 ฟังก์ชัน `_launchBrowser`** ที่ทั้ง IPC handler และ `launchInstance` เรียกใช้
2. สร้าง **1 ฟังก์ชัน `_runBlockOnPage`** ที่ทั้ง IPC handler และ `runBlock` เรียกใช้
3. IPC handler เป็นแค่ wrapper เรียก direct function

### 📝 ขั้นตอน
1. ให้ IPC `playwright:launch` เรียก `launchInstance()` แทนโค้ดซ้ำ
2. ให้ IPC `playwright:run-block` เรียก `runBlock()` แทนโค้ดซ้ำ
3. ทดสอบทั้ง 2 flow: กดปุ่มจาก UI + Scheduler auto-run
4. ตรวจสอบว่า error handling เหมือนเดิมทั้ง 2 flow

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- **playwright-bridge.js** → แก้ไขหนัก (ลดโค้ด ~400 บรรทัด)
- **scheduler.js** → ไม่ต้องแก้ (เรียก `launchInstance` / `runBlock` เหมือนเดิม)
- **main.js** → ไม่ต้องแก้ (IPC handler ชี้ไปที่เดิม)
- **ต้องทดสอบทั้ง 2 flow อย่างละเอียด**

### 🏷️ สถานะ: ⬜ ยังไม่เริ่ม

---

## Phase 6: ย้าย API Key ออกจากโค้ด

### 🔍 ปัญหา
Firebase API Key ถูกฝังตรงๆ ใน 2 ไฟล์:
```
scheduler.js บรรทัด 10:  const API_KEY = 'AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE'
firebase.js  บรรทัด 5:   const API_KEY = 'AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE'
```

### 📄 ไฟล์ที่ใช้ API_KEY (นับแล้วทุกบรรทัด)
| ไฟล์ | จำนวนจุดที่ใช้ | อยู่ฝั่งไหน |
|------|--------------|-----------|
| `scheduler.js` | **10 จุด** (1 declaration + 9 usages) | Main Process (Node.js) |
| `firebase.js` | **20 จุด** (1 declaration + 19 usages) | Renderer Process (Browser) |

**scheduler.js (10 จุด):** บรรทัด 10(decl), 129, 169, 198, 284, 296, 342, 350, 417, 435
**firebase.js (20 จุด):** บรรทัด 5(decl), 96, 120, 145, 182, 206, 230, 265, 286, 315, 347, 379, 419, 451, 485, 524, 565, 646, 678, 690

### ✅ วิธีแก้ไข
1. สร้างไฟล์ config กลาง (`electron/config.js`) เก็บ API Key ที่เดียว
2. ทั้ง `scheduler.js` และ `firebase.js` import จาก config
3. **หมายเหตุ:** Firebase API Key สำหรับ Web App ไม่ถือว่าเป็น secret จริงๆ (Google ออกแบบมาให้ใช้ใน client)  
   แต่ควร restrict key ใน Google Cloud Console ด้วย:
   - จำกัดให้ใช้ได้เฉพาะ Firestore API
   - จำกัด Referrer/IP (ถ้าเป็นไปได้)
4. ใช้ Firestore Security Rules เป็นด่านป้องกันหลัก

### 📝 ขั้นตอน
1. สร้าง `electron/config.js` เก็บ `FIREBASE_PROJECT_ID`, `API_KEY`, `FIRESTORE_BASE`
2. แก้ `scheduler.js` ให้ import จาก config
3. แก้ `firebase.js` ให้ import จาก config (ผ่าน preload หรือ env variable)
4. ตรวจสอบว่า Firestore Security Rules เข้มงวดพอ
5. (Optional) ใช้ environment variable แทน hardcode

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- **scheduler.js** → เปลี่ยน import API_KEY
- **firebase.js** → เปลี่ยน import API_KEY (⚠️ ไฟล์นี้อยู่ฝั่ง Renderer ต้องระวังวิธี import)
- **config.js** → ไฟล์ใหม่
- **preload.js** → อาจต้องเพิ่ม expose config (ถ้า firebase.js ต้องการ)
- **vite.config.js** → อาจต้องเพิ่ม define env variable

### 🏷️ สถานะ: ⬜ ยังไม่เริ่ม

---

## Phase 7: แก้ Scheduler Block-Project Matching (ใช้ Block ผิดตัว)

### 🔍 ปัญหา
Scheduler `getAutomationBlock()` ไม่สามารถเชื่อม Block กับ Project ได้ถูกต้อง

```javascript
// scheduler.js getAutomationBlock() บรรทัด 848-898
const projectBlock = firebaseBlocks.find(b => b.projectId === projectId);
// → blocks จาก global_recipe_blocks ไม่มี projectId
// → find() return undefined เสมอ
// → fallback: ใช้ block แรกเสมอ → ทุก Project ใช้ Block เดียวกัน!
```

**หมายเหตุ:** นี่เป็นปัญหา**เดิม**ที่มีอยู่ก่อน refactor — แต่ Phase 1 ทำให้เห็นชัดขึ้น

### 📄 ไฟล์ที่เกี่ยวข้อง
- `scheduler.js` `getAutomationBlock()` บรรทัด 848-898
- `firebase.js` `fetchInstanceSettings()` บรรทัด 440-475
- `Dashboard.jsx` instance creation + block selection UI

### ✅ วิธีแก้ไข
1. Scheduler อ่าน instances จาก electron-store → หา instance ที่มี `projectId` ตรง
2. ดึง `selectedBlockId` จาก `instance_settings` ของ instance นั้น
3. ใช้ `selectedBlockId` ค้นหา block จาก `global_recipe_blocks`
4. ถ้าหาไม่เจอ → fallback ใช้ block แรก (เหมือนเดิม)

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- **scheduler.js** → แก้ `getAutomationBlock` logic
- **main.js** → อาจต้องส่ง `instances` map ให้ scheduler เข้าถึงได้

### 🏷️ สถานะ: ⬜ ยังไม่เริ่ม

---

## Phase 8: รวม toFirestoreValue ซ้ำ + แก้ Execution Logs Path

### 🔍 ปัญหา A: `toFirestoreValue` มี 2 copy ซ้ำกัน
```
firebase.js  บรรทัด 38-72   (Renderer) → ฉบับสมบูรณ์
scheduler.js บรรทัด 201-216 (Main)     → ฉบับ inline ใน saveExecutionLogFromScheduler
```
ถ้าแก้ firebase.js แล้ว scheduler.js ไม่แก้ด้วย → data format ไม่ตรงกัน

### 🔍 ปัญหา B: Execution Logs Path ไม่ตรงกับ Web App
Firestore Rules มี **2 path** สำหรับ logs:
```
Desktop Agent เขียน: users/{userId}/executionLogs/{logId}              (camelCase, flat)
Firestore Rule:  users/{userId}/projects/{projectId}/execution_logs/{logId} (snake_case, nested)
```
Web App อาจใช้ path ที่ต่างกัน → ดู logs ไม่เจอ

### ✅ วิธีแก้ไข
**A:** สร้าง shared utility `firestoreHelpers.js` ใน `electron/` เก็บ `toFirestoreValue`/`parseFirestoreValue` ที่เดียว
**B:** ตรวจ Web App ว่าใช้ path ไหน → แก้ให้ตรงกัน หรือเพิ่ม alias query

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- **scheduler.js** → import จาก shared utility แทน inline copy
- **firebase.js** → ยังใช้ตัวเอง (อยู่ฝั่ง Renderer ไม่สามารถ require) อาจใช้ Vite alias
- **Web App (frontend/)** → ตรวจสอบและแก้ path ถ้าไม่ตรง

### 🏷️ สถานะ: ⬜ ยังไม่เริ่ม

---

## 😨 ผลจำลอง: ปัญหาที่พบเมื่อแก้ครบ 6 Phase

### ⚠️ ปัญหาที่ 1: Phase 5 — IPC runBlock มี BUG ซ่อนอยู่ (Normal Mode)
**พบจากการจำลอง:** เมื่อ IPC `playwright:run-block` handler (บรรทัด 315-346) รัน Step ใน Normal Mode แล้ว **step ล้มเหลว**:
```javascript
// IPC handler ปัจจุบัน (บรรทัด 338-342)
if (!result.success) {
  console.error(`❌ Step ${i + 1} failed: ${result.error}`);
  break;  // ← แค่ break ออกจาก for loop
}
// ... แล้วตกมาที่นี่:
return { success: true, results };  // ← ❌ BUG! return success:true แม้ step พัง!
```
**แต่ Direct `runBlock` (บรรทัด 1277-1280) ทำถูก:**
```javascript
if (!result.success) {
  return { success: false, results, error: result.error, currentStep: i + 1, failedStep: step };
}
```
**ผลกระทบหลังรวมโค้ด (Phase 5):**
- **ก่อนแก้:** Dashboard.jsx แสดง "สำเร็จ" แม้ step พัง (เพราะ IPC return success:true)
- **หลังแก้:** Dashboard.jsx แสดง "ล้มเหลว" ถูกต้อง (เพราะ Direct return success:false)
- **สรุป:** นี่คือ **Bug Fix** ที่ดี แต่ต้อง**แจ้ง User** ว่าอาจเห็น "failed" มากขึ้นกว่าเดิม (เพราะเดิมซ่อนไว้)

**วิธีแก้ไข:** เพิ่มหมายเหตุใน Phase 5 ว่านี่เป็น behavior change ที่แก้ bug

---

### ⚠️ ปัญหาที่ 2: Phase 6 — firebase.js อยู่ฝั่ง Renderer ไม่สามารถ require() จาก electron/config.js ได้
**พบจากการจำลอง:** แพลนเดิมบอกว่า "สร้าง `electron/config.js` แล้ว import จากทุกที่" แต่:
- `scheduler.js` อยู่ฝั่ง **Main Process** (Node.js, CommonJS) → `require('./config')` ได้ ✅
- `firebase.js` อยู่ฝั่ง **Renderer Process** (Vite bundle, ES Modules) → `require('../electron/config')` **ไม่ได้!** ❌

ไฟล์ `firebase.js` ถูก Vite bundle เป็น browser JS → ไม่สามารถ require ไฟล์จาก electron/ ได้

**วิธีแก้ไขที่ถูกต้อง:**
1. สร้าง `config/firebase.json` (ไฟล์ JSON กลาง)
   ```json
   { "API_KEY": "AIza...", "PROJECT_ID": "content-auto-post" }
   ```
2. **Main Process** (`scheduler.js`): `const config = require('../config/firebase.json')`
3. **Renderer Process** (`firebase.js`): ใช้ Vite `define` ใน `vite.config.js`:
   ```javascript
   import config from './config/firebase.json';
   export default defineConfig({
     define: {
       __FIREBASE_API_KEY__: JSON.stringify(config.API_KEY),
       __FIREBASE_PROJECT_ID__: JSON.stringify(config.PROJECT_ID)
     }
   });
   ```
4. แก้ `firebase.js`: `const API_KEY = __FIREBASE_API_KEY__`

**สรุป:** ต้องแก้วิธีการใน Phase 6 ทั้งหมด

---

### ⚠️ ปัญหาที่ 3: Phase 1→6 ข้าม Phase — Phase 1 เพิ่ม API_KEY usage ใหม่
**พบจากการจำลอง:** Phase 1 สร้างฟังก์ชัน `saveBlockToFirestore` ใหม่ที่ใช้ REST API:
```javascript
const url = `${FIRESTORE_BASE}/users/${userId}/blocks/${blockId}?key=${API_KEY}`;
```
นี่เพิ่ม API_KEY usage ใหม่ **1 จุด** ใน scheduler.js

- **ก่อน Phase 1:** scheduler.js มี 10 จุด
- **หลัง Phase 1:** scheduler.js มี **11 จุด** ← Phase 6 นับผิดถ้าไม่อัพเดท

**วิธีแก้ไข:** อัพเดท Phase 6 ให้รู้ว่า scheduler.js จะมี 11 จุดหลัง Phase 1

---

## � ผลตรวจสอบเชิงลึก: Firebase + Recorder + Scheduler + Instance Manager (Full Audit)

> ตรวจสอบโดยเทรซ data flow ทั้งระบบ: Cloud Functions → Firestore → Desktop App (Main+Renderer)
> อ้างอิง: firebase.js, scheduler.js, playwright-bridge.js, instance-manager.js, RecorderPanel.jsx, Dashboard.jsx, main.js, preload.js, firestore.rules, functions/index.js

---

### 🔴 BUG-A: Modifiers (Options) หายตอน Save Block — ร้ายแรง!

**ไฟล์:** `RecorderPanel.jsx` บรรทัด 351-364
**ปัญหา:** เมื่อ save block จะ map steps เหลือแค่ 4 fields:
```javascript
steps.map(s => ({
  action: s.action, selector: s.selector || '', value: s.value || '', text: s.text || ''
}))
// ❌ modifiers (preActions/postActions) ถูกตัดทิ้ง!
```
**ผลกระทบ:** Admin ตั้ง Options ให้ step (retry_on_fail, wait_progress, validate_scene) → Save แล้ว **หายหมด** → Automation ที่ต้องใช้ Options จะ fail
**วิธีแก้:** เพิ่ม `modifiers: s.modifiers || undefined` ในการ save
**ความยาก:** ⭐ ง่ายมาก (1 บรรทัด) — ควรแก้พร้อม Phase 1

---

### 🔴 BUG-B: Scheduler อ่าน Block จาก Firestore Path ผิด — หา Block ไม่เจอ!

**ไฟล์:** `scheduler.js` บรรทัด 167-190 (`fetchBlocksFromFirebase`)
**ปัญหา:**
| ส่วน | Firestore Path | ผลลัพธ์ |
|------|---------------|---------|
| Recorder save | `global_recipe_blocks/{blockId}` | ✅ Dashboard อ่านได้ |
| Scheduler load | `users/{userId}/blocks` | ❌ **Collection คนละอัน!** |
| Shoot to Block | `users/{userId}/blocks/{blockId}` | ❌ พัง (Phase 1) + Rules block |

**ผลกระทบ:** Scheduler auto-run → `getAutomationBlock()` → อ่าน `users/{userId}/blocks` → **ว่างเปล่า** → ไม่สามารถรัน Automation ได้
**วิธีแก้:** แก้ Scheduler `fetchBlocksFromFirebase` ให้อ่านจาก `global_recipe_blocks` เหมือน Dashboard
**ความยาก:** ⭐⭐ ปานกลาง — ควรทำเป็น **Phase 1.5 ใหม่**

---

### 🔴 BUG-C: Firestore Rules ไม่อนุญาต `users/{userId}/blocks` — แม้แก้ Phase 1 ก็ยังพัง!

**ไฟล์:** `firestore.rules` บรรทัด 59-72
**ปัญหา:** ไม่มี explicit rule สำหรับ `users/{userId}/blocks/{blockId}` ที่ allow Agent

```
// มี explicit rules (allow: true) สำหรับ:
users/{userId}/block_settings/{blockId}     ✅
users/{userId}/instance_settings/{instanceId} ✅
users/{userId}/executionLogs/{logId}         ✅
// ❌ ไม่มี users/{userId}/blocks/{blockId} !!!
```

Wildcard rule `/{subcollection}/{docId}` ต้อง `isOwner(userId)` → ต้อง Firebase Auth → Desktop Agent ใช้ API Key → `request.auth = null` → **DENIED**

**ผลกระทบ:** แม้แก้ Phase 1 สำเร็จ → Firestore Rules **block การ write** → Shoot to Block ยังไม่ทำงาน
**วิธีแก้:** เพิ่ม Firestore Rule:
```
match /users/{userId}/blocks/{blockId} {
  allow read, write: if true;
}
```
**ความยาก:** ⭐ ง่ายมาก — แก้ใน `firestore.rules` แล้ว `firebase deploy --only firestore:rules`

---

### 🔴 BUG-D: instance-manager.js มี executeStep ซ้ำ (ชุดที่ 3) ที่ไม่ครบ!

**ไฟล์:** `instance-manager.js` บรรทัด 147-179
**ปัญหา:** มี `executeStep` ของตัวเองที่รองรับแค่ **5 จาก 30+ actions**:
- ✅ มี: click, type/input, wait, wait_for_element, wait_for_disappear
- ❌ ขาด: fill_prompt, fill_action, fill_script, loop_start, loop_end, click_text, hover, goto, wait_progress_complete, และอื่นๆ อีก 20+ actions
- ❌ ไม่มี `executeStepWithModifiers` → pre/post actions ไม่ทำงาน

**ผลกระทบ:** ถ้า `instance:run-all` ถูกเรียก → actions ใหม่จะ **fail silent** (unknown action ไม่ throw)
**วิธีแก้:** ลบ `executeStep` ใน instance-manager.js → ใช้ `executeStepWithModifiers` จาก playwright-bridge.js
**ความยาก:** ⭐⭐ ปานกลาง — ควรรวมกับ Phase 5

---

### 🟡 BUG-E: `parseFirestoreValue` ใน scheduler.js ขาด 3 data types

**ไฟล์:** `scheduler.js` บรรทัด 97-113
**ปัญหา:** เทียบกับ `fromFirestoreValue` ใน firebase.js:
| Data Type | firebase.js | scheduler.js |
|-----------|------------|-------------|
| timestampValue | ✅ `new Date()` | ❌ ขาด |
| doubleValue | ✅ | ❌ ขาด |
| nullValue | ✅ `return null` | ❌ ขาด |

**ผลกระทบ:** Timestamp/Double/Null ถูก parse ผิดเป็น raw Firestore object — ยังไม่ crash แต่ข้อมูลผิด
**วิธีแก้:** เพิ่ม 3 cases (3 บรรทัด)
**ความยาก:** ⭐ ง่ายมาก — ควรแก้พร้อม Phase 3

---

### 🟡 BUG-F: onShootToBlock บันทึก Block โดยไม่มี projectId

**ไฟล์:** `Dashboard.jsx` บรรทัด 939-966
**ปัญหา:** Blocks จาก `global_recipe_blocks` ไม่มี `projectId` → Scheduler `getAutomationBlock()` ค้นหา block ที่มี `projectId` ตรง → ไม่เจอ → ใช้ fallback (block แรก) → อาจใช้ Block **ผิดตัว**
**วิธีแก้:** เพิ่ม `projectId` เมื่อ Shoot to Block
**ความยาก:** ⭐ ง่ายมาก — ควรแก้พร้อม Phase 1

---

### 🔵 ISSUE-G: `episodeTopic` field name ไม่ตรงกับ Cloud Function

**ไฟล์:** `scheduler.js` บรรทัด 758 vs `functions/index.js` บรรทัด 593-604
- Cloud Function save: `episodeTitle`
- Scheduler read: `episodeTopic`
**ผลกระทบ:** เล็กน้อย — ใช้แค่ใน logging
**วิธีแก้:** เปลี่ยนเป็น `readyPromptData.episodeTitle || ''`

---

### 🔵 ISSUE-H: `label`/`emoji` ถูกตัดตอน Save Block

**ไฟล์:** `RecorderPanel.jsx` บรรทัด 351-364
**ผลกระทบ:** เล็กน้อย — cosmetic เมื่อ load block กลับมา edit
**วิธีแก้:** เพิ่ม `label: s.label || undefined, emoji: s.emoji || undefined` พร้อม BUG-A

---

## ✅ ส่วนที่ตรวจแล้วถูกต้อง

| Flow | ผลตรวจ |
|------|--------|
| readyPrompts path (Dashboard vs Scheduler) | ✅ ตรงกัน: `users/{userId}/projects/{projectId}/readyPrompts` |
| readyPrompts structure (Cloud Function → variables) | ✅ ตรงกัน: image/video/social types + action/script/title/duration/audio |
| Loop variable injection | ✅ ถูกต้อง: `executeStep` อ่าน `variables.prompt`, `variables.action` ฯลฯ |
| toFirestoreValue / fromFirestoreValue (firebase.js) | ✅ Handle nested objects/arrays ถูกต้อง |
| executionLogs path + Firestore Rule | ✅ ตรงกัน: `users/{userId}/executionLogs` + allow: true |
| Recorder ACTION_TYPES ↔ executeStep switch cases | ✅ ตรงกัน 1:1 ทั้ง 22 actions |
| Slots path (Dashboard vs Scheduler) | ✅ ตรงกัน: `users/{userId}/projects/{projectId}/slots` |
| Scheduler shouldRunNow logic (day/time/status/expander) | ✅ ถูกต้อง |

---

## 📊 สรุปปัญหาทั้งหมด (ผลจำลอง + ตรวจเชิงลึก รวม 11 ปัญหา)

| # | ปัญหา | ระดับ | ไฟล์ | ควรแก้ใน Phase |
|---|-------|-------|------|---------------|
| **A** | Modifiers หายตอน save | 🔴 CRITICAL | RecorderPanel.jsx | Phase 1 |
| **B** | Scheduler อ่าน block path ผิด | 🔴 CRITICAL | scheduler.js | **Phase 1.5 ใหม่** |
| **C** | Firestore Rules block blocks/ | 🔴 CRITICAL | firestore.rules | **Phase 1.5 ใหม่** |
| **D** | instance-manager executeStep ไม่ครบ | 🔴 CRITICAL | instance-manager.js | Phase 5 |
| **E** | parseFirestoreValue ขาด 3 types | 🟡 SIGNIFICANT | scheduler.js | Phase 3 |
| **F** | Shoot to Block ไม่มี projectId | 🟡 SIGNIFICANT | Dashboard.jsx | Phase 1 |
| **G** | episodeTopic field ไม่ตรง | 🔵 MINOR | scheduler.js | Phase 3 |
| **H** | label/emoji หายตอน save | 🔵 MINOR | RecorderPanel.jsx | Phase 1 |
| P5 | IPC runBlock return success:true เมื่อ fail | 🔴 (เดิม) | playwright-bridge.js | Phase 5 |
| P6-a | firebase.js ไม่สามารถ require electron/ | 🔴 (เดิม) | firebase.js + vite.config.js | Phase 6 |
| ~~P6-b~~ | ~~Phase 1 เพิ่ม API_KEY~~ → **ไม่ใช่ปัญหาแล้ว** (Phase 1 ใช้ `updateBlock` จาก firebase.js ไม่ได้เพิ่มฟังก์ชันใน scheduler.js) | ✅ แก้แล้ว | — | — |

---

## 📊 สรุป Phase ทั้งหมด (อัพเดทหลังตรวจ Dependency)

> ⚠️ **Phase 1 + 1.5 ถูกรวมกันแล้ว** เพราะมี dependency ซึ่งกันและกัน:
> - Phase 1 เดิมเขียนไป `users/{userId}/blocks` แต่ต้องรอ Firestore Rule จาก Phase 1.5
> - Phase 1.5 เปลี่ยน Scheduler ให้อ่าน `global_recipe_blocks` → ทำให้ `users/{userId}/blocks` ไร้ประโยชน์
> - **ตัดสินใจ:** ใช้ `global_recipe_blocks` เป็น **Single Source of Truth** ทุก component อ่าน/เขียนที่เดียวกัน

| Phase | ปัญหา | BUGs ที่แก้ | ไฟล์ที่แก้ | ความยาก | สถานะ |
|-------|-------|------------|-----------|---------|-------|
| **1** | Block System ทั้งหมด (รวม 1+1.5) | BUG-A,B,C,F,H + crash fix | scheduler.js, RecorderPanel.jsx, Dashboard.jsx, firestore.rules | ⭐⭐ | ⬜ |
| **2** | Debug Selector path ผิด | — | playwright-bridge.js | ⭐ | ⬜ |
| **3** | fetch() ใน Node.js | BUG-E, ISSUE-G | scheduler.js | ⭐ | ⬜ |
| **4** | Memory Leak listener | — | preload.js + 3 components | ⭐⭐ | ⬜ |
| **5** | โค้ดซ้ำ 400+ บรรทัด | BUG-D, P5 | playwright-bridge.js, instance-manager.js | ⭐⭐⭐ | ⬜ |
| **6** | API Key ฝังในโค้ด | P6-a | config/firebase.json + vite.config.js | ⭐⭐⭐ | ⬜ |
| **7** | Scheduler Block-Project Matching | — | scheduler.js, main.js | ⭐⭐ | ⬜ |
| **8** | toFirestoreValue ซ้ำ + Logs Path | — | scheduler.js, firebase.js, frontend/ | ⭐⭐ | ⬜ |

### 🏗️ สถาปัตยกรรม Block System หลังแก้ Phase 1 (Single Source of Truth)
```
┌─────────────────────────────────────────────────────────┐
│                  global_recipe_blocks                     │
│                (Single Source of Truth)                    │
├─────────────────────────────────────────────────────────┤
│  WRITE:                                                   │
│    Recorder  → createBlock() / updateBlock()  (firebase.js) │
│    ShootToBlock → updateBlock()               (firebase.js) │ ← เปลี่ยนใหม่!
│                                                           │
│  READ:                                                    │
│    Dashboard → fetchBlocks()                  (firebase.js) │
│    Scheduler → fetchBlocksFromFirebase()      (scheduler.js) │ ← แก้ path!
└─────────────────────────────────────────────────────────┘

users/{userId}/blocks  → ยังคง Firestore Rule ไว้ (backward compat)
                         แต่ไม่มี component ใดเขียน/อ่านอีกต่อไป
```

### 🎯 ลำดับการทำงาน (Final — 8 Phase)
```
Phase 1     → Phase 2    → Phase 3     → Phase 4   → Phase 5      → Phase 6    → Phase 7        → Phase 8
(Block System  (Debug path)  (fetch+parse)  (Mem leak)  (Code dedup    (API Key)   (Block-Project   (Logs+Helpers
 ทั้งหมด)                                               +inst-mgr)                Matching)        alignment)
```

**กลุ่ม A (Phase 1-4):** แก้บักร้ายแรง — crash, path ผิด, data หาย, memory leak
**กลุ่ม B (Phase 5-6):** ปรับโครงสร้าง — รวมโค้ดซ้ำ, ย้าย key
**กลุ่ม C (Phase 7-8):** ปรับปรุงคุณภาพ — matching logic, data alignment

แต่ละ Phase จะ:
1. อ่านโค้ดที่เกี่ยวข้องทั้งหมด
2. วางแผนและยืนยันก่อนแก้ไข
3. แก้ไขอย่างระมัดระวัง
4. Build + Publish version ใหม่
5. อัพเดทไฟล์ บันทึกปัญหา.md
