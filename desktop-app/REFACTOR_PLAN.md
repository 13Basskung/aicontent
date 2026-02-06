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

### 📄 Frontend ที่เรียกใช้ (ต้องตรวจสอบ)
- **App.jsx** บรรทัด 38: `window.electronAPI.onUpdateStatus(...)`
- **App.jsx** บรรทัด 47: `window.electronAPI.onGoogleLoginReminder(...)`
- **SchedulerPanel.jsx**: `onTrigger`, `onUpdate`, `onStatus`, `onAutoStarted`
- **RecorderPanel.jsx**: `onStarted`, `onStopped`, `onStep`

### ✅ วิธีแก้ไข
เปลี่ยน pattern ใน `preload.js` ให้:
1. ลบ listener เก่าก่อน add ใหม่ (`ipcRenderer.removeAllListeners` ก่อน `on`)
2. เพิ่มฟังก์ชัน `removeListener` ให้ Frontend เรียก cleanup ได้

### 📝 ขั้นตอน
1. แก้ `preload.js` ทุก `on` callback ให้ `removeAllListeners` ก่อน
2. ตรวจสอบว่า Frontend component ทุกตัวยังทำงานปกติ
3. (Optional) เพิ่ม cleanup function ให้ Frontend ใช้ `useEffect cleanup`

### ⚠️ ผลกระทบกับฟังก์ชันอื่น
- **preload.js** → แก้ไข 10 จุด
- **App.jsx** → ควรเพิ่ม cleanup ใน useEffect (ไม่จำเป็นแต่ดีกว่า)
- **SchedulerPanel.jsx** → ควรเพิ่ม cleanup
- **RecorderPanel.jsx** → ควรเพิ่ม cleanup
- **Dashboard.jsx** → ตรวจสอบว่ามี listener หรือไม่

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

### 📄 ความแตกต่างเล็กน้อยระหว่าง 2 ชุด
| จุดต่าง | IPC Handler | Direct Function |
|---------|-------------|-----------------|
| Navigate about:blank | `page.evaluate(() => window.location.href = 'about:blank')` | `page.goto('about:blank', ...)` |
| Navigate startUrl | `page.goto(block.startUrl, ...)` | `page.evaluate((url) => window.location.href = url)` |
| Check instance exists | ไม่มี | มี `instances.has()` |
| Error return | `{ success: false, error }` | `{ success: false, error, currentStep, failedStep }` |

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

### 📄 ไฟล์ที่ใช้ API_KEY
| ไฟล์ | จำนวนจุดที่ใช้ | อยู่ฝั่งไหน |
|------|--------------|-----------|
| `scheduler.js` | 7 จุด | Main Process (Node.js) |
| `firebase.js` | 18 จุด | Renderer Process (Browser) |

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

## 📊 สรุป Phase ทั้งหมด

| Phase | ปัญหา | ไฟล์ที่แก้ | ความยาก | ความเสี่ยง |
|-------|-------|-----------|---------|-----------|
| **1** | `saveBlockToFirestore` crash | scheduler.js | ⭐ ง่าย | 🔴 สูง |
| **2** | Debug Selector path ผิด | playwright-bridge.js | ⭐ ง่าย | 🔴 สูง |
| **3** | `fetch()` ใน Node.js | scheduler.js | ⭐ ง่าย | 🟡 กลาง |
| **4** | Memory Leak listener | preload.js + 3 components | ⭐⭐ ปานกลาง | 🟡 กลาง |
| **5** | โค้ดซ้ำ 400+ บรรทัด | playwright-bridge.js | ⭐⭐⭐ ยาก | 🟡 กลาง |
| **6** | API Key ฝังในโค้ด | scheduler.js + firebase.js + config ใหม่ | ⭐⭐ ปานกลาง | 🟢 ต่ำ |

### 🎯 ลำดับการทำงาน
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
(แก้ crash)  (แก้ path)  (แก้ fetch)  (แก้ leak)  (รวมโค้ด)  (ย้าย key)
```

แต่ละ Phase จะ:
1. อ่านโค้ดที่เกี่ยวข้องทั้งหมด
2. วางแผนและยืนยันก่อนแก้ไข
3. แก้ไขอย่างระมัดระวัง
4. Build + Publish version ใหม่
5. อัพเดทไฟล์ บันทึกปัญหา.md
