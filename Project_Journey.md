# 🚀 Content Auto Post - Project Journey

> **เอกสารฉบับสมบูรณ์** | อัปเดตล่าสุด: 2026-01-25  
> **Live URL:** https://aicontents.vip  
> **GitHub:** https://github.com/13Basskung/aicontent

---

## 📖 สารบัญ

1. [ภาพรวมโปรเจกต์](#-ภาพรวมโปรเจกต์)
2. [สถาปัตยกรรมระบบ](#-สถาปัตยกรรมระบบ-architecture)
3. [โครงสร้างไฟล์](#-โครงสร้างไฟล์-file-structure)
4. [Tech Stack](#-tech-stack)
5. [ระบบ Frontend](#-ระบบ-frontend)
6. [ระบบ Backend](#-ระบบ-backend-firebase)
7. [Chrome Extension](#-chrome-extension)
8. [ระบบ Subscription](#-ระบบ-subscription)
9. [Database Schema](#-database-schema-firestore)
10. [Security Rules](#-security-rules)
11. [Deployment](#-deployment)
12. [Feature Modules](#-feature-modules-รายละเอียด)
13. [Development Workflow](#-development-workflow)

---

## 🎯 ภาพรวมโปรเจกต์

### วิสัยทัศน์ (Vision)
**Content Auto Post** คือระบบ SaaS สำหรับสร้างและโพสต์คอนเทนต์วิดีโอไปยังโซเชียลมีเดียหลายแพลตฟอร์มโดยอัตโนมัติ ใช้ AI ช่วยสร้างเนื้อหา และ Chrome Extension เป็นตัวแทนในการโพสต์

### เป้าหมายหลัก (Core Objectives)
| # | เป้าหมาย | สถานะ |
|:--|:---------|:------|
| 1 | สร้าง Prompt/Content ด้วย AI อัตโนมัติ | ✅ |
| 2 | Schedule การโพสต์ล่วงหน้า | ✅ |
| 3 | โพสต์อัตโนมัติผ่าน Chrome Extension | ✅ |
| 4 | รองรับ Multi-Platform (Facebook, TikTok, Instagram, YouTube) | ✅ |
| 5 | ระบบ Subscription & Payment | ✅ |
| 6 | Marketplace สำหรับซื้อขาย Extenders | ✅ |

### User Flow หลัก
```
[User สร้าง Project] 
    → [ตั้ง Schedule ด้วย TimeSlot Picker]
    → [เลือก Mode + Extender]
    → [ระบบสร้าง Jobs อัตโนมัติ]
    → [Extension โพสต์ตาม Schedule]
    → [บันทึก History]
```

---

## 🏗️ สถาปัตยกรรมระบบ (Architecture)

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  React 19 + Vite 7 + TailwindCSS + React Router 7       │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  Pages: Dashboard, Projects, ModeCreator, Marketplace   │    │
│  │         Payments, Characters, Platforms, Admin, Learn   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
└──────────────────────── Firebase SDK ───────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FIREBASE                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │   Firestore   │  │   Functions   │  │   Storage     │        │
│  │   (Database)  │  │   (Backend)   │  │   (Files)     │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │     Auth      │  │    Hosting    │                           │
│  │   (Google)    │  │   (Optional)  │                           │
│  └───────────────┘  └───────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Content Auto Post Agent (Manifest V3)                  │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  • Side Panel UI (React)                                │    │
│  │  • Content Scripts (Recorder/Player)                    │    │
│  │  • Background Service Worker                            │    │
│  │  • Firebase Realtime Sync                               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────▶│ Frontend │────▶│ Firebase │────▶│Extension │
│          │     │  (React) │     │(Firestore)│     │ (Chrome) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                 │                │
     │  1. Login      │                 │                │
     │───────────────▶│  2. Auth        │                │
     │                │────────────────▶│                │
     │                │                 │                │
     │  3. Create     │  4. Save        │                │
     │     Project    │     to DB       │                │
     │───────────────▶│────────────────▶│                │
     │                │                 │                │
     │  5. Set        │  6. Create      │  7. Listen     │
     │     Schedule   │     Jobs        │     Jobs       │
     │───────────────▶│────────────────▶│◀───────────────│
     │                │                 │                │
     │                │                 │  8. Execute    │
     │                │                 │     & Post     │
     │                │                 │───────────────▶│
     │                │                 │                │
     │                │                 │  9. Update     │
     │                │  10. Show       │     Status     │
     │◀───────────────│◀────────────────│◀───────────────│
```

---

## 📁 โครงสร้างไฟล์ (File Structure)

```
content-auto-post/
│
├── 📂 frontend/                    # React Web Application
│   ├── 📂 src/
│   │   ├── 📂 pages/               # หน้าหลักทั้งหมด (14 ไฟล์)
│   │   │   ├── Admin.jsx           # 180KB - Admin Panel (จัดการ Users, Subscriptions, Payments)
│   │   │   ├── Dashboard.jsx       # 50KB  - หน้าแรก Overview
│   │   │   ├── Projects.jsx        # 139KB - จัดการ Projects, TimeSlots, Jobs
│   │   │   ├── ModeCreator.jsx     # 118KB - สร้าง/แก้ไข Modes
│   │   │   ├── ExpanderCreator.jsx # 173KB - สร้าง/แก้ไข Extenders
│   │   │   ├── Characters.jsx      # 53KB  - จัดการ Characters
│   │   │   ├── Platforms.jsx       # 16KB  - เชื่อมต่อ Social Media
│   │   │   ├── Marketplace.jsx     # 96KB  - ซื้อขาย Extenders
│   │   │   ├── Payments.jsx        # 110KB - Wallet, ฝาก/ถอน, Subscription
│   │   │   ├── Learn.jsx           # 52KB  - คู่มือการใช้งาน (8 Tabs)
│   │   │   ├── LandingPage.jsx     # 35KB  - หน้าแรกสำหรับ Guest
│   │   │   ├── MusicCreator.jsx    # 11KB  - สร้างเพลง (Future)
│   │   │   └── PodcastCreator.jsx  # 9KB   - สร้าง Podcast (Future)
│   │   │
│   │   ├── 📂 components/          # React Components
│   │   │   ├── AutomationBuilder.jsx    # 24KB - สร้าง Automation Flows
│   │   │   ├── CinematicStep.jsx        # 4KB  - Step UI Component
│   │   │   ├── ModeConsultant.jsx       # 35KB - AI Mode Consultant
│   │   │   ├── PostingSchedule.jsx      # 26KB - Schedule Visualizer
│   │   │   ├── 📂 Projects/             # Project-specific components
│   │   │   │   ├── ContentQueue.jsx     # Episode Queue Management
│   │   │   │   ├── JobsPanel.jsx        # Jobs Queue Display
│   │   │   │   └── HistoryPanel.jsx     # Job History Display
│   │   │   └── 📂 ui/                   # Reusable UI Components
│   │   │       ├── ConfirmModal.jsx     # Confirmation Dialog
│   │   │       └── LoadingSpinner.jsx   # Loading Indicator
│   │   │
│   │   ├── 📂 hooks/               # Custom React Hooks
│   │   │   ├── useSubscription.js  # 9KB - Subscription State Management
│   │   │   └── useConfirmModal.jsx # 4KB - Modal State Hook
│   │   │
│   │   ├── 📂 utils/               # Utility Functions
│   │   │   └── subscriptionUtils.js # 10KB - Subscription Logic & Pricing
│   │   │
│   │   ├── 📂 locales/             # i18n Translations
│   │   │   ├── en.json             # English
│   │   │   ├── th.json             # Thai (Default)
│   │   │   └── zh.json             # Chinese
│   │   │
│   │   ├── App.jsx                 # 15KB - Main App Component & Routing
│   │   ├── firebase.js             # 1KB  - Firebase Configuration
│   │   ├── i18n.js                 # 1KB  - i18next Configuration
│   │   ├── main.jsx                # Entry Point
│   │   ├── index.css               # Global Styles
│   │   └── App.css                 # App-specific Styles
│   │
│   ├── package.json                # Frontend Dependencies
│   ├── vite.config.js              # Vite Configuration
│   ├── tailwind.config.js          # TailwindCSS Configuration
│   └── postcss.config.js           # PostCSS Configuration
│
├── 📂 extension/                   # Chrome Extension
│   ├── 📂 src/
│   │   ├── App.jsx                 # 36KB - Main Extension UI
│   │   ├── UserPanel.jsx           # 132KB - User Control Panel
│   │   ├── firebase.js             # 1KB  - Extension Firebase Config
│   │   ├── 📂 background/
│   │   │   └── index.js            # Service Worker
│   │   └── 📂 content/
│   │       ├── recorder.js         # Action Recorder
│   │       └── player.js           # Action Player
│   │
│   ├── manifest.json               # Extension Manifest V3
│   ├── package.json                # Extension Dependencies
│   └── vite.config.js              # Vite Build Config
│
├── 📂 functions/                   # Firebase Cloud Functions
│   ├── index.js                    # 143KB - All Cloud Functions
│   ├── test-runner.js              # 10KB - Test Utilities
│   └── package.json                # Functions Dependencies
│
├── 📂 legacy_desktop_agent/        # Legacy Python Agent (Deprecated)
│
├── 📄 firestore.rules              # 7KB  - Database Security Rules
├── 📄 firestore.indexes.json       # 3KB  - Firestore Indexes
├── 📄 storage.rules                # 1KB  - Storage Security Rules
├── 📄 firebase.json                # Firebase Project Config
│
├── 📄 task.md                      # Task Tracking
├── 📄 implementation_plan.md       # Implementation Details
├── 📄 walkthrough.md               # System Walkthrough
├── 📄 BLOCK_SYSTEM_PLAN.md         # Block System Architecture
└── 📄 README.md                    # Project Documentation
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| **React** | 19.2.0 | UI Framework |
| **Vite** | 7.2.4 | Build Tool & Dev Server |
| **React Router** | 7.12.0 | Client-side Routing |
| **TailwindCSS** | 3.4.17 | Utility-first CSS |
| **Lucide React** | 0.562.0 | Icon Library |
| **i18next** | 25.7.4 | Internationalization |
| **Firebase SDK** | 12.7.0 | Backend Services |
| **QRCode.react** | 4.2.0 | QR Code Generation |
| **PromptPay QR** | 0.5.0 | Thai Payment QR |

### Backend (Firebase)
| Service | Purpose |
|:--------|:--------|
| **Firestore** | NoSQL Database |
| **Cloud Functions** | Serverless Backend (Node.js 20) |
| **Authentication** | Google OAuth |
| **Storage** | File Storage |
| **Hosting** | Static Web Hosting (Optional) |

### Cloud Functions Dependencies
| Package | Version | Purpose |
|:--------|:--------|:--------|
| **firebase-admin** | 12.0.0 | Admin SDK |
| **firebase-functions** | 5.1.0 | Functions Framework |
| **openai** | 4.20.0 | AI Content Generation |
| **@google-cloud/text-to-speech** | 6.4.0 | Text-to-Speech |

### Chrome Extension
| Technology | Version | Purpose |
|:-----------|:--------|:--------|
| **Manifest** | V3 | Extension Standard |
| **React** | 19.2.0 | UI Framework |
| **Firebase SDK** | 10.12.2 | Realtime Sync |
| **@crxjs/vite-plugin** | 2.0.0-beta | Build Plugin |

### Hosting & Deployment
| Service | Purpose |
|:--------|:--------|
| **Cloudflare Pages** | Frontend Hosting & CDN |
| **GitHub** | Source Control |
| **Firebase** | Backend Hosting |

---

## 💻 ระบบ Frontend

### หน้าหลัก (Pages)

#### 1. Dashboard (`Dashboard.jsx`)
- **ขนาด:** 50KB
- **หน้าที่:** แสดงภาพรวมของระบบ
- **ฟีเจอร์:**
  - สถิติการโพสต์ (วัน/สัปดาห์/เดือน)
  - กราฟ Performance
  - Quick Actions
  - Recent Activity Feed
  - Subscription Status Badge

#### 2. Projects (`Projects.jsx`)
- **ขนาด:** 139KB
- **หน้าที่:** จัดการ Projects ทั้งหมด
- **ฟีเจอร์:**
  - CRUD Projects
  - TimeSlot Picker (7 วัน x 24 ชั่วโมง)
  - Platform Selector
  - Mode & Extender Assignment
  - Content Queue Management
  - Jobs Queue & History
  - Episode Settings (Sequential/Random)
  - Auto-Refill Configuration

#### 3. Mode Creator (`ModeCreator.jsx`)
- **ขนาด:** 118KB
- **หน้าที่:** สร้างและแก้ไข Modes
- **ฟีเจอร์:**
  - Mode Editor (Name, Category, Description)
  - System Instructions Editor
  - Story Overview Editor
  - Block Builder (Drag & Drop)
  - Character Assignment
  - Undo/Redo History
  - Preview Mode

#### 4. Expander Creator (`ExpanderCreator.jsx`)
- **ขนาด:** 173KB
- **หน้าที่:** สร้างและแก้ไข Extenders
- **ฟีเจอร์:**
  - Extender Editor
  - Default Groups (Language, Visual, Mood, Lighting, Audio, Camera)
  - Custom Block Creation
  - Block Selection UI
  - Preview & Test

#### 5. Characters (`Characters.jsx`)
- **ขนาด:** 53KB
- **หน้าที่:** จัดการ Character Library
- **ฟีเจอร์:**
  - Character CRUD
  - Detailed Character Data:
    - Basic Info (Name, Image, Gender)
    - Personality Traits
    - Voice Style
    - Appearance Details (Skin, Eyes, Hair)
    - Custom Description
  - Search & Filter
  - Character Gallery View

#### 6. Platforms (`Platforms.jsx`)
- **ขนาด:** 16KB
- **หน้าที่:** เชื่อมต่อ Social Media Accounts
- **ฟีเจอร์:**
  - Platform Cards (Facebook, TikTok, Instagram, YouTube)
  - Account Management
  - Connection Status
  - Multi-Account Support

#### 7. Marketplace (`Marketplace.jsx`)
- **ขนาด:** 96KB
- **หน้าที่:** ซื้อขาย Extenders
- **ฟีเจอร์:**
  - Browse Extenders by Category
  - Search & Filter
  - Detail View with Preview
  - Rating & Reviews
  - Purchase Flow
  - Sell Extender Flow
  - Trial System

#### 8. Payments (`Payments.jsx`)
- **ขนาด:** 110KB
- **หน้าที่:** จัดการการเงิน
- **ฟีเจอร์:**
  - Wallet Balance Display
  - Deposit via PromptPay QR
  - Withdrawal to Bank Account
  - Bank Account Management
  - Transaction History
  - Subscription Purchase
  - Extra Resources Purchase

#### 9. Admin (`Admin.jsx`)
- **ขนาด:** 180KB
- **หน้าที่:** Admin Panel
- **ฟีเจอร์:**
  - User Management
  - Subscription Manager (CRUD)
  - Payment Approval (Deposits, Withdrawals)
  - Credit Management
  - System Logs
  - Statistics Dashboard

#### 10. Learn (`Learn.jsx`)
- **ขนาด:** 52KB
- **หน้าที่:** คู่มือการใช้งาน
- **ฟีเจอร์:**
  - 8 Tabs: Extension, Project, Mode, Extender, Characters, Platforms, Marketplace, Payment
  - Step-by-step Instructions
  - Tips & FAQ
  - Download Links

### Custom Hooks

#### `useSubscription.js`
```javascript
// ฟังก์ชันหลัก
const { 
  subscription,      // ข้อมูล Subscription ปัจจุบัน
  loading,           // สถานะ Loading
  error,             // Error (ถ้ามี)
  getStatus,         // ตรวจสอบสถานะ (isActive, isBlocked, tier, limits)
  canCreate,         // ตรวจสอบว่าสร้าง Project/Mode/Extender ได้หรือไม่
  shouldShowBillingNotice  // ควรแสดงแจ้งเตือนบิลหรือไม่
} = useSubscription(userId);
```

### Utility Functions

#### `subscriptionUtils.js`
| Function | Description |
|:---------|:------------|
| `calculateLimits(extraProjects)` | คำนวณ Limits ตามจำนวน Projects |
| `calculateProrate(price, date)` | คำนวณราคา Prorate ตามวันที่เหลือ |
| `calculateTotalPrice(...)` | คำนวณราคารวมสำหรับ Subscription |
| `createInitialSubscription(userId)` | สร้าง Free Trial Subscription |
| `createApprovedSubscription(...)` | สร้าง Subscription หลังอนุมัติชำระเงิน |
| `checkShouldBlock(expiry, status)` | ตรวจสอบว่าควร Block หรือไม่ |
| `checkFreeTrial(trialEndsAt)` | ตรวจสอบสถานะ Free Trial |
| `formatPrice(amount)` | Format ราคาเป็น Thai Baht |
| `formatThaiDate(date)` | Format วันที่เป็นภาษาไทย |

### Internationalization (i18n)
- **ภาษาที่รองรับ:** English (en), Thai (th), Chinese (zh)
- **Default:** English
- **Config:** `src/i18n.js`
- **Translations:** `src/locales/*.json`

---

## ☁️ ระบบ Backend (Firebase)

### Cloud Functions

#### Content Generation
| Function | Trigger | Description |
|:---------|:--------|:------------|
| `testPromptPipeline` | Callable | ทดสอบ Prompt Pipeline (บันทึก testLogs/) |
| `scheduleJobs` | Callable | สร้าง Jobs จาก Schedule (บันทึก readyPrompts/) |
| `autoGenerateEpisodes` | Callable | AI สร้าง Episodes อัตโนมัติ |
| `expandScenesWithTopic` | Internal | Shared Logic สำหรับขยาย Prompt |
| `generateTitlesAndTags` | Internal | สร้าง Title และ Tags |

#### Episode Management
| Function | Trigger | Description |
|:---------|:--------|:------------|
| `getNextEpisode` | Internal | ดึง Episode ถัดไป (Sequential/Random) |
| `getRemainingEpisodeCount` | Internal | นับจำนวน Episode ที่เหลือ |
| `markEpisodeAsUsed` | Internal | เปลี่ยนสถานะ Episode เป็น "used" |

#### Cleanup (Scheduled)
| Function | Schedule | Description |
|:---------|:---------|:------------|
| `cleanupExpiredTestLogs` | Daily 2:00 AM UTC | ลบ testLogs ที่หมดอายุ |
| `cleanupOldEpisodeHistory` | Weekly Sunday 3:00 AM UTC | ลบ History เก่ากว่า 30 วัน |

### Firebase Configuration
```javascript
// frontend/src/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE",
  authDomain: "content-auto-post.firebaseapp.com",
  projectId: "content-auto-post",
  storageBucket: "content-auto-post.firebasestorage.app",
  messagingSenderId: "710780145350",
  appId: "1:710780145350:web:f15040b92353daa93ad1c7",
  measurementId: "G-XXMR04318T",
  databaseURL: "https://content-auto-post-default-rtdb.asia-southeast1.firebasedatabase.app"
};
```

---

## 🧩 Chrome Extension

### Manifest V3 Configuration
```json
{
  "manifest_version": 3,
  "name": "Content Auto Post Agent",
  "version": "1.0.0",
  "permissions": [
    "sidePanel",    // Side Panel UI
    "activeTab",    // Current Tab Access
    "storage",      // Local Storage
    "alarms",       // Scheduled Tasks
    "downloads",    // File Downloads
    "scripting"     // Script Injection
  ],
  "host_permissions": ["<all_urls>"]
}
```

### Extension Components

#### 1. Side Panel UI (`App.jsx`, `UserPanel.jsx`)
- แสดงสถานะการเชื่อมต่อ
- Jobs Queue
- History
- Settings

#### 2. Content Scripts
- **recorder.js:** บันทึก User Actions
- **player.js:** เล่น Recorded Actions

#### 3. Background Service Worker
- ฟัง Jobs จาก Firestore
- Execute Jobs ตาม Schedule
- Heartbeat & Status Update

### Extension Flow
```
1. User เปิด Extension
2. Extension เชื่อมต่อ Firebase (Connection Key)
3. Extension ฟัง agent_jobs collection
4. เมื่อถึงเวลา Schedule:
   a. ดึง Job Data
   b. เปิด Platform (Facebook/TikTok/etc.)
   c. Execute Recorded Actions
   d. Upload Content
   e. Mark Job as Complete
5. Update History
```

---

## 💳 ระบบ Subscription

### Pricing Structure
| รายการ | ราคา |
|:-------|:-----|
| Pro Plan (รายเดือน) | ฿199 |
| Extra Project (Add-on) | ฿250/เดือน |

### Limits ตาม Plan

#### Free Trial (7 วัน)
| Resource | Limit |
|:---------|:------|
| Projects | 1 |
| Modes | 1 |
| Extenders | 1 |

#### Pro Plan (฿199/เดือน)
| Resource | Limit |
|:---------|:------|
| Projects | 1 |
| Modes | 2 |
| Extenders | 2 |

#### Extra Project (฿250/Project/เดือน)
| Resource | เพิ่มต่อ Project |
|:---------|:----------------|
| Projects | +1 |
| Modes | +2 |
| Extenders | +2 |

### Subscription Tiers
| Tier | คำอธิบาย |
|:-----|:---------|
| `Free` | Free Trial (7 วัน) |
| `VIP` | Pro Plan (฿199) |
| `Premium` | Pro + Extra Projects |
| `Expired` | หมดอายุ (Limit = 0) |

### Subscription Flow
```
1. User สมัคร → ได้ Free Trial 7 วัน
2. Trial หมด → ต้องซื้อ Pro Plan (฿199)
3. ต้องการเพิ่ม → ซื้อ Extra Project (฿250/Project)
4. ทุกสิ้นเดือน → ต่ออายุ Subscription
5. ไม่ต่ออายุ → Grace Period 3 วัน → Block
```

### Grace Period Rules
- **วันที่ 1-3 ของเดือน:** Grace Period (ยังใช้งานได้)
- **หลังวันที่ 3:** Block การใช้งาน

---

## 🗄️ Database Schema (Firestore)

### Collections Structure

```
firestore/
│
├── 📁 users/{userId}
│   ├── email: string
│   ├── displayName: string
│   ├── role: "user" | "admin"
│   ├── language: "th" | "en" | "zh"
│   ├── createdAt: timestamp
│   │
│   ├── 📁 subscription/main
│   │   ├── plan: "free_trial" | "pro"
│   │   ├── status: "active" | "expired"
│   │   ├── tier: "Free" | "VIP" | "Premium" | "Expired"
│   │   ├── extraProjects: number
│   │   ├── totalProjects: number
│   │   ├── limits: { projects, modes, extenders }
│   │   ├── startDate: timestamp
│   │   ├── expiryDate: timestamp
│   │   ├── trialEndsAt: timestamp
│   │   └── isTrialUsed: boolean
│   │
│   ├── 📁 projects/{projectId}
│   │   ├── name: string
│   │   ├── concept: string
│   │   ├── scenes: number (1-10)
│   │   ├── aspect: "9:16" | "16:9" | "1:1"
│   │   ├── modeType: "system" | "custom" | "marketplace"
│   │   ├── modeId: string (reference)
│   │   ├── expanderIds: string[] (references)
│   │   ├── status: "active" | "paused"
│   │   ├── timezone: string
│   │   ├── episodeSelection: "sequential" | "random"
│   │   ├── autoRefillEnabled: boolean
│   │   ├── autoRefillThreshold: number
│   │   ├── autoRefillCount: number
│   │   ├── createdAt: timestamp
│   │   │
│   │   ├── 📁 slots/{slotId}           # TimeSlot Schedule
│   │   ├── 📁 episodes/{episodeId}     # Content Queue
│   │   ├── 📁 episodeHistory/{id}      # Used Episodes
│   │   ├── 📁 agent_jobs/{jobId}       # Jobs for Extension
│   │   └── 📁 logs/{logId}             # Project Logs
│   │
│   ├── 📁 modes/{modeId}
│   │   ├── name: string
│   │   ├── category: string
│   │   ├── description: string
│   │   ├── systemInstructions: string
│   │   ├── storyOverview: string
│   │   ├── characters: array
│   │   ├── blocks: array
│   │   └── createdAt: timestamp
│   │
│   ├── 📁 extenders/{extenderId}
│   │   ├── name: string
│   │   ├── description: string
│   │   ├── category: string
│   │   ├── blocks: array
│   │   └── createdAt: timestamp
│   │
│   ├── 📁 accounts/{accountId}         # Connected Platforms
│   │   ├── platform: "youtube" | "facebook" | "tiktok" | "instagram"
│   │   ├── accountName: string
│   │   └── status: "active" | "suspended"
│   │
│   └── 📁 wallet/main                  # User Wallet
│       ├── balance: number
│       ├── transactions: array
│       └── updatedAt: timestamp
│
├── 📁 characters/{charId}              # Global Characters
│   ├── name: string
│   ├── image: string (URL)
│   ├── gender: string
│   ├── personality: string
│   ├── role: string
│   ├── voiceStyle: string
│   ├── appearance: object
│   ├── customDescription: string
│   ├── creatorId: string
│   └── createdAt: timestamp
│
├── 📁 marketplace/{expanderId}         # Marketplace Listings
│   ├── name: string
│   ├── description: string
│   ├── price: number
│   ├── category: string
│   ├── sellerId: string
│   ├── rating: number
│   ├── reviews: array
│   ├── salesCount: number
│   ├── trialEnabled: boolean
│   └── createdAt: timestamp
│
├── 📁 payment_requests/{requestId}     # Deposit Requests
│   ├── userId: string
│   ├── amount: number
│   ├── status: "pending" | "approved" | "rejected"
│   ├── qrCode: string
│   └── createdAt: timestamp
│
├── 📁 withdrawal_requests/{requestId}  # Withdrawal Requests
│   ├── userId: string
│   ├── amount: number
│   ├── bankAccount: object
│   ├── status: "pending" | "approved" | "rejected"
│   └── createdAt: timestamp
│
├── 📁 subscription_payments/{id}       # Subscription Payments
│   ├── userId: string
│   ├── amount: number
│   ├── plan: string
│   ├── extraProjects: number
│   ├── billingMonth: "current" | "next"
│   ├── expiryDate: timestamp
│   └── status: "pending" | "approved"
│
├── 📁 testLogs/{logId}                 # Test Results (TTL: 7 days)
├── 📁 readyPrompts/{promptId}          # Production Prompts
├── 📁 agent_status/{projectId}         # Extension Status
├── 📁 settings/{docId}                 # System Settings
├── 📁 logs/{logId}                     # System Logs
├── 📁 admin_credit_logs/{logId}        # Admin Credit Actions
└── 📁 admin_subscription_logs/{logId}  # Admin Subscription Actions
```

---

## 🔒 Security Rules

### Firestore Rules Summary

```javascript
// Helper Functions
isAuthenticated()    // User ต้อง Login
isOwner(userId)      // User ต้องเป็นเจ้าของ
isAdmin()            // User ต้องเป็น Admin

// Collection Access
users/{userId}           → Owner or Admin
users/{userId}/**        → Owner or Admin
characters/{id}          → Public Read, Auth Create, Owner Edit/Delete
marketplace/{id}         → Public Read, Auth Create, Seller/Admin Edit
payment_requests/{id}    → Owner Read/Create, Admin Update
settings/{id}            → Public Read, Admin Write
agent_jobs/{id}          → Public (for Extension)
```

### Key Security Principles
1. **User Data Isolation:** ผู้ใช้เห็นเฉพาะข้อมูลของตัวเอง
2. **Admin Override:** Admin เข้าถึงข้อมูลทุกคนได้
3. **Public Marketplace:** ทุกคนดู Marketplace ได้
4. **Extension Access:** Extension เข้าถึง Jobs ได้โดยไม่ต้อง Auth

---

## 🚀 Deployment

### Live URLs
| Service | URL |
|:--------|:----|
| **Production** | https://aicontents.vip |
| **WWW** | https://www.aicontents.vip |
| **GitHub** | https://github.com/13Basskung/aicontent |

### Cloudflare Pages Configuration
| Setting | Value |
|:--------|:------|
| **Project Name** | aicontent |
| **Framework** | None (Vite) |
| **Build Command** | `npm run build` |
| **Build Output** | `dist` |
| **Root Directory** | `frontend` |
| **Production Branch** | `main` |
| **Auto Deploy** | ✅ Enabled |

### Deployment Flow
```
1. แก้ไขโค้ดใน VS Code
2. Commit changes (Ctrl+Shift+G → พิมพ์ message → ✓ Commit)
3. Push to GitHub (Sync Changes หรือ git push)
4. Cloudflare Pages จะ build และ deploy อัตโนมัติ
5. ใช้เวลาประมาณ 1-2 นาที
```

### Firebase Deployment
```bash
# Deploy Functions
firebase deploy --only functions

# Deploy Firestore Rules
firebase deploy --only firestore:rules

# Deploy Storage Rules
firebase deploy --only storage

# Deploy All
firebase deploy
```

---

## 📦 Feature Modules รายละเอียด

### Module 1: Project Management
```
┌─────────────────────────────────────────┐
│           PROJECT MANAGEMENT            │
├─────────────────────────────────────────┤
│ • Create/Edit/Delete Projects           │
│ • TimeSlot Picker (7x24 Grid)           │
│ • Platform Selection                    │
│ • Mode & Extender Assignment            │
│ • Timezone Configuration                │
│ • Project Status (Active/Paused)        │
└─────────────────────────────────────────┘
```

### Module 2: Content Pipeline
```
┌─────────────────────────────────────────┐
│           CONTENT PIPELINE              │
├─────────────────────────────────────────┤
│ Input:                                  │
│ • Mode (Structure + Instructions)       │
│ • Extender (Style + Effects)            │
│ • Episode (Topic/Theme)                 │
│                                         │
│ Process:                                │
│ • expandScenesWithTopic()               │
│ • AI Generation (OpenAI)                │
│ • generateTitlesAndTags()               │
│                                         │
│ Output:                                 │
│ • Expanded Prompts (per Scene)          │
│ • Title & Tags                          │
│ • readyPrompts/ Document                │
└─────────────────────────────────────────┘
```

### Module 3: Episode Queue System
```
┌─────────────────────────────────────────┐
│         EPISODE QUEUE SYSTEM            │
├─────────────────────────────────────────┤
│ Status Flow:                            │
│ pending → processing → used             │
│                                         │
│ Selection Modes:                        │
│ • Sequential: ตามลำดับ order            │
│ • Random: สุ่มจาก pending               │
│                                         │
│ Auto-Refill:                            │
│ • Trigger: เหลือ < threshold            │
│ • AI สร้าง Episodes ใหม่               │
│ • ใช้ History เป็น Context             │
└─────────────────────────────────────────┘
```

### Module 4: Subscription & Payment
```
┌─────────────────────────────────────────┐
│       SUBSCRIPTION & PAYMENT            │
├─────────────────────────────────────────┤
│ Wallet:                                 │
│ • Balance Management                    │
│ • Deposit (PromptPay QR)                │
│ • Withdrawal (Bank Transfer)            │
│                                         │
│ Subscription:                           │
│ • Free Trial (7 days)                   │
│ • Pro Plan (฿199/month)                 │
│ • Extra Projects (฿250/project)         │
│ • Prorate Calculation                   │
│ • Grace Period (3 days)                 │
│                                         │
│ Admin Approval:                         │
│ • Deposit Verification                  │
│ • Withdrawal Processing                 │
│ • Subscription Activation               │
└─────────────────────────────────────────┘
```

### Module 5: Extension Automation
```
┌─────────────────────────────────────────┐
│       EXTENSION AUTOMATION              │
├─────────────────────────────────────────┤
│ Connection:                             │
│ • Connection Key Authentication         │
│ • Firebase Realtime Sync                │
│ • Heartbeat Status                      │
│                                         │
│ Job Execution:                          │
│ • Listen agent_jobs Collection          │
│ • Execute at Scheduled Time             │
│ • Platform-specific Actions             │
│ • Error Handling & Retry                │
│                                         │
│ Supported Platforms:                    │
│ • Facebook (Page/Profile)               │
│ • TikTok (Video Upload)                 │
│ • Instagram (Reels/Stories)             │
│ • YouTube (Shorts/Videos)               │
└─────────────────────────────────────────┘
```

---

## 🔄 Development Workflow

### Local Development
```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173

# Extension
cd extension
npm install
npm run dev          # Load unpacked in Chrome

# Functions (Emulator)
cd functions
npm install
firebase emulators:start --only functions
```

### Git Workflow
```bash
# 1. Pull latest
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes
# ... code ...

# 4. Commit
git add .
git commit -m "feat: add new feature"

# 5. Push
git push origin feature/new-feature

# 6. Create PR on GitHub
# 7. Merge to main → Auto Deploy
```

### Commit Message Convention
```
feat: เพิ่มฟีเจอร์ใหม่
fix: แก้ไขบัก
docs: อัปเดตเอกสาร
style: แก้ไข formatting
refactor: ปรับโครงสร้างโค้ด
test: เพิ่ม/แก้ไข tests
chore: งานอื่นๆ (dependencies, build, etc.)
```

---

## 📊 Project Statistics

### Codebase Size
| Component | Files | Lines | Size |
|:----------|:------|:------|:-----|
| Frontend Pages | 14 | ~15,000 | ~1.1MB |
| Frontend Components | 9+ | ~3,000 | ~150KB |
| Frontend Utils/Hooks | 3 | ~600 | ~22KB |
| Extension | 10+ | ~5,000 | ~170KB |
| Cloud Functions | 1 | ~4,000 | ~143KB |
| **Total** | **40+** | **~28,000** | **~1.6MB** |

### Dependencies
| Component | Packages |
|:----------|:---------|
| Frontend | 12 runtime + 12 dev |
| Extension | 3 runtime + 12 dev |
| Functions | 4 runtime + 1 dev |

---

## 📝 Appendix

### A. Environment Variables
```env
# Firebase (ไม่ต้องตั้ง - hardcoded ใน firebase.js)
# ใช้ Firebase Console สำหรับ API Keys

# Cloudflare Pages (Auto-configured)
# ไม่ต้องตั้ง Environment Variables
```

### B. Useful Commands
```bash
# Firebase
firebase login
firebase projects:list
firebase deploy --only functions
firebase emulators:start

# Git
git status
git log --oneline -10
git diff

# NPM
npm run dev
npm run build
npm run lint
```

### C. Troubleshooting

| ปัญหา | วิธีแก้ |
|:------|:-------|
| Firebase Auth Error | ตรวจสอบ firebaseConfig |
| Extension ไม่เชื่อมต่อ | ตรวจสอบ Connection Key |
| Deploy ไม่สำเร็จ | ตรวจสอบ Build Logs บน Cloudflare |
| Functions Error | ดู Logs: `firebase functions:log` |

---

## 🎉 สรุป

**Content Auto Post** เป็นระบบ SaaS ที่ครบครันสำหรับการสร้างและโพสต์คอนเทนต์อัตโนมัติ ประกอบด้วย:

1. **Frontend:** React 19 + Vite + TailwindCSS
2. **Backend:** Firebase (Firestore, Functions, Auth, Storage)
3. **Extension:** Chrome Extension (Manifest V3)
4. **Hosting:** Cloudflare Pages + Firebase

ระบบรองรับ Multi-language (TH/EN/ZH), Multi-platform (FB/TikTok/IG/YT), และมี Subscription System พร้อม Marketplace สำหรับซื้อขาย Extenders

---

> **Document Version:** 1.0.0  
> **Last Updated:** 2026-01-25  
> **Author:** AI Development Team
