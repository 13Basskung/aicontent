# 📋 Block System Implementation Plan
> วันที่: 2 กุมภาพันธ์ 2026  
> เวอร์ชัน: 1.6.0

---

## 🎯 เป้าหมาย
สร้างระบบ Block ที่แยกเป็น 2 ประเภท:
1. **Block สร้างวีดีโอ** (User เห็น + เลือกได้)
2. **Block โพส Platform** (Admin เท่านั้นเห็น) - ระบบเลือกอัตโนมัติตาม Posting Schedule

---

## 📊 โครงสร้างข้อมูล

### Block Schema (ใหม่)
```javascript
{
  id: "block_xxx",
  name: "สร้างวีดีโอ V1",
  description: "สร้างวีดีโอด้วย Google Vids",
  type: "video" | "platform",           // ใหม่!
  platform: null | "youtube" | "tiktok" | "facebook" | "instagram",  // ใหม่!
  startUrl: "https://...",               // ใหม่!
  steps: [
    { action: "goto", value: "https://..." },
    { action: "click", selector: "#btn" },
    { action: "fill", selector: "#input", value: "text" }
  ],
  createdBy: "userId",
  createdAt: "2026-02-02T..."
}
```

### Firestore Paths
| ข้อมูล | Path |
|--------|------|
| Blocks | `global_recipe_blocks/{blockId}` |
| Slots (Platforms) | `users/{userId}/projects/{projectId}/slots/{slotId}` |
| Instance Settings | `users/{userId}/instance_settings/{instanceId}` |

---

## ✅ Checklist การแก้ไข

### Phase 1: Block Schema & Save Logic ✅
- [x] **1.1** แก้ไข `firebase.js` - อัปเดต `createBlock()` ให้รองรับ `type`, `platform`, `startUrl`
- [x] **1.2** แก้ไข `firebase.js` - เพิ่มฟังก์ชัน `updateBlock()` สำหรับแก้ไข Block เดิม
- [x] **1.3** แก้ไข `RecorderPanel.jsx` - เพิ่ม state สำหรับ `blockType`, `blockPlatform`
- [x] **1.4** แก้ไข `RecorderPanel.jsx` - เพิ่ม UI เลือกประเภท Block (video/platform)
- [x] **1.5** แก้ไข `RecorderPanel.jsx` - เพิ่ม UI เลือก Platform (ถ้า type = platform)
- [x] **1.6** แก้ไข `RecorderPanel.jsx` - แก้ไข `handleSaveBlock()` ให้รวม `startUrl` เป็น Step แรก

### Phase 2: Edit Block Functionality ✅
- [x] **2.1** เพิ่ม state `editingBlock` ใน `RecorderPanel.jsx`
- [x] **2.2** เพิ่มปุ่ม "แก้ไข" (Edit) บน Block ใน Available Blocks
- [x] **2.3** เมื่อกดแก้ไข → โหลด Steps ขึ้นในกล่อง Steps
- [x] **2.4** เพิ่ม Popup ให้เลือก "อัปเดตทับ" หรือ "สร้างใหม่"
- [x] **2.5** ถ้าเลือก "อัปเดตทับ" → เรียก `updateBlock()` 
- [x] **2.6** ถ้าเลือก "สร้างใหม่" → เรียก `createBlock()`

### Phase 3: Test Block (Full Execution) ✅
- [x] **3.1** เปลี่ยนชื่อ Instance dropdown → "เลือก Instance เพื่อทดสอบ"
- [x] **3.2** เพิ่มปุ่ม "ทดสอบ" (Play) บน Block ใน Available Blocks
- [ ] **3.3** เมื่อกดทดสอบ → ตรวจสอบว่าเลือก Instance แล้วหรือยัง (TODO: เชื่อมกับ RecorderPanel)
- [ ] **3.4** ดึง Platforms จาก Posting Schedule ของ Instance นั้น (TODO: เชื่อมกับ Scheduler)
- [ ] **3.5** รัน Block "สร้างวีดีโอ" ที่เลือก (TODO: เชื่อมกับ Automation)
- [ ] **3.6** รัน Block "โพส Platform" ตาม Platforms ที่ตั้งค่าไว้ (TODO: เชื่อมกับ Automation)
- [ ] **3.7** แสดง Progress/Status ระหว่างรัน (TODO: เพิ่ม UI)

### Phase 4: UI Styling (Platform Colors) ✅
- [x] **4.1** เพิ่มสี Block ตาม Platform:
  - สร้างวีดีโอ: สีม่วง `bg-purple-500/20`
  - YouTube: สีแดง `bg-red-600/20 border-red-500`
  - TikTok: สีดำ `bg-black/50 border-white/20`
  - Facebook: สีฟ้า `bg-blue-600/20 border-blue-500`
  - Instagram: Gradient `bg-gradient-to-r from-purple-500 to-pink-500`
- [x] **4.2** เพิ่ม Icon Platform บน Block card
- [x] **4.3** แยก Available Blocks เป็น 2 columns (ซ้าย=วีดีโอ, ขวา=Platform)

### Phase 5: Permission Control ✅
- [x] **5.1** แก้ไข Instances tab → แสดงเฉพาะ Block `type: "video"`
- [x] **5.2** แก้ไข Recorder tab → แสดงทุก Block (Admin only)
- [x] **5.3** เพิ่ม Filter/Group Blocks ตามประเภท ใน Recorder tab (แยก 2 columns)

### Phase 6: Testing & Publish ✅
- [x] **6.1** ทดสอบบันทึก Block ใหม่ (type: video)
- [x] **6.2** ทดสอบบันทึก Block ใหม่ (type: platform)
- [x] **6.3** ทดสอบแก้ไข Block (อัปเดตทับ)
- [x] **6.4** ทดสอบแก้ไข Block (สร้างใหม่)
- [ ] **6.5** ทดสอบปุ่มทดสอบ - รัน Block สร้างวีดีโอ + โพส Platform อัตโนมัติ (TODO: Phase 3.3-3.7)
- [ ] **6.6** ทดสอบ User เห็นเฉพาะ Block สร้างวีดีโอ
- [ ] **6.7** Build & Publish v1.6.0

---

## 🔄 Flow การทำงาน (หลังแก้ไข)

```
┌──────────────────────────────────────────────────────────────────────┐
│  📝 ADMIN สร้าง Blocks (Recorder Tab)                                │
│  ├─ Block "สร้างวีดีโอ V1" (type: video, startUrl: google-vids)      │
│  ├─ Block "โพส YouTube" (type: platform, platform: youtube)         │
│  ├─ Block "โพส TikTok" (type: platform, platform: tiktok)           │
│  └─ Block "โพส Facebook" (type: platform, platform: facebook)       │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  👤 USER ตั้งค่า Instance (Instances Tab)                            │
│  ├─ เลือก Block: "สร้างวีดีโอ V1" (เห็นเฉพาะ type: video)            │
│  └─ Posting Schedule: เลือก Platforms = [Facebook, YouTube]         │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  ▶️ กดปุ่ม "ทดสอบ" หรือ Scheduler ทริกเกอร์                          │
│  ├─ Step 1: ดึง Platforms จาก Slot → [facebook, youtube]            │
│  ├─ Step 2: รัน Block "สร้างวีดีโอ V1" → ได้ไฟล์วีดีโอ               │
│  ├─ Step 3: หา Block ที่ platform = "facebook" → รัน                 │
│  ├─ Step 4: หา Block ที่ platform = "youtube" → รัน                  │
│  └─ ❌ ข้าม TikTok, IG (ไม่ได้เลือกใน Slot)                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📁 ไฟล์ที่ต้องแก้ไข

| ไฟล์ | การแก้ไข |
|------|----------|
| `src/lib/firebase.js` | เพิ่ม `updateBlock()`, แก้ไข `createBlock()` |
| `src/components/RecorderPanel.jsx` | UI ประเภท Block, แก้ไข Block, ทดสอบ Block |
| `src/components/Dashboard.jsx` | สี Platform, ซ่อน Block จาก User, ปุ่มทดสอบ/แก้ไข |

---

## 🎨 Platform Colors Reference

| Platform | Background | Border | Text |
|----------|------------|--------|------|
| **Video (default)** | `bg-purple-500/20` | `border-purple-500/30` | `text-purple-400` |
| **YouTube** | `bg-red-600/20` | `border-red-500/50` | `text-red-400` |
| **TikTok** | `bg-black/50` | `border-white/20` | `text-white` |
| **Facebook** | `bg-blue-600/20` | `border-blue-500/50` | `text-blue-400` |
| **Instagram** | `bg-gradient-to-r from-purple-600/20 to-pink-600/20` | `border-pink-500/50` | `text-pink-400` |

---

## 📝 Notes
- ทุก Block ที่ `type: "platform"` จะถูกรันอัตโนมัติตาม Platforms ใน Posting Schedule
- User ไม่เห็น Block ประเภท `platform` ในแทป Instances
- Admin เห็นทุก Block ในแทป Recorder
- ปุ่ม "ทดสอบ" จะรันทั้ง Block สร้างวีดีโอ + Block โพส Platform ตามที่ตั้งค่าไว้

---

## 📌 Status
- **Current Phase:** Phase 1 (Block Schema & Save Logic)
- **Next Step:** แก้ไข firebase.js - เพิ่ม type, platform, startUrl ใน createBlock()
