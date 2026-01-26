# 📊 Dashboard Upgrade Task - Content Auto Post

**สร้างเมื่อ:** 27 มกราคม 2568  
**สถานะ:** กำลังดำเนินการ  
**ไฟล์หลัก:** `frontend/src/pages/Dashboard.jsx`

---

## ✅ สิ่งที่ทำเสร็จแล้ว (Phase 1)

### 1. Hero Summary Cards (4 การ์ด)
- [x] **ผู้ติดตามทั้งหมด** - แสดงรวมจากทุก Platform
- [x] **ยอดวิวทั้งหมด** - แสดง 0 (รอเชื่อม API)
- [x] **วีดีโอทั้งหมด** - แสดงจำนวนวีดีโอ
- [x] **รอโพสต์** - แสดงจำนวน Queue

### 2. Quick Actions
- [x] ปุ่ม **"สร้างวีดีโอใหม่"** → Link ไป `/projects`
- [x] ปุ่ม **"Queue"** → Link ไป `/content-queue`

### 3. Projects Table (FastClip Style)
- [x] คอลัมน์: Project, Subs, Views, Videos, Followers, Last Scheduled, สถานะ, Actions
- [x] ปุ่ม View, Play, Share สำหรับแต่ละ Project
- [x] ปุ่ม "New Project"

### 4. Platform Accounts Table
- [x] คอลัมน์: บัญชี, แพลตฟอร์ม, ผู้ติดตาม, วันนี้, วีดีโอ, สถานะ
- [x] Filter ตาม Platform

---

## 🔧 สิ่งที่ต้องทำต่อ (พรุ่งนี้)

### Phase 1.1: เพิ่มคอลัมน์ Views ใน Platform Accounts Table
**ไฟล์:** `frontend/src/pages/Dashboard.jsx`
**รายละเอียด:**
- เพิ่มคอลัมน์ "Views" ในตาราง Platform Accounts
- แสดงยอด Views ของแต่ละ Account
- ตำแหน่ง: หลังคอลัมน์ "ผู้ติดตาม" หรือก่อน "สถานะ"

**โค้ดที่ต้องแก้ไข (บรรทัดประมาณ 848-856):**
```jsx
<thead className="bg-slate-800/50">
    <tr>
        <th>บัญชี</th>
        <th>แพลตฟอร์ม</th>
        <th>ผู้ติดตาม</th>
        <th>วันนี้</th>
        <th>วีดีโอ</th>
        <th>Views</th>  <!-- เพิ่มใหม่ -->
        <th>สถานะ</th>
    </tr>
</thead>
```

---

### Phase 1.2: คลิก Project แล้วแสดงเฉพาะ Platform ที่ผูกกับ Project นั้น
**ไฟล์:** `frontend/src/pages/Dashboard.jsx`
**รายละเอียด:**
1. เพิ่ม State: `selectedProjectId` เพื่อเก็บ Project ที่เลือก
2. เมื่อคลิกชื่อ Project → Set `selectedProjectId`
3. Filter Platform Accounts Table ให้แสดงเฉพาะ Account ที่ผูกกับ Project นั้น
4. แสดง UI ว่ากำลังดู Platform ของ Project ไหน
5. มีปุ่ม "ดูทั้งหมด" เพื่อ Reset Filter

**โค้ดที่ต้องเพิ่ม:**
```jsx
// State
const [selectedProjectId, setSelectedProjectId] = useState(null);
const [selectedProjectName, setSelectedProjectName] = useState('');

// Filter Logic
const filteredAccountsByProject = useMemo(() => {
    if (!selectedProjectId) return filteredAccounts;
    // Filter accounts ที่ผูกกับ project นี้
    return filteredAccounts.filter(acc => 
        acc.projectIds?.includes(selectedProjectId)
    );
}, [filteredAccounts, selectedProjectId]);

// เมื่อคลิกชื่อ Project
<td onClick={() => {
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);
}} className="cursor-pointer hover:text-red-400">
    {project.name}
</td>
```

**หมายเหตุ:** ต้องตรวจสอบโครงสร้างข้อมูลว่า Account มี field `projectIds` หรือไม่ ถ้าไม่มีต้องเพิ่มใน Firestore Schema

---

### Phase 2: YouTube API - ดึง Subscribers/Views จริง
**ไฟล์ที่เกี่ยวข้อง:**
- `frontend/src/pages/Dashboard.jsx`
- `functions/index.js` (อาจต้องสร้าง Cloud Function ใหม่)

**รายละเอียด:**
1. **YouTube Data API v3** - ต้องใช้ API Key
2. Endpoint: `https://www.googleapis.com/youtube/v3/channels`
3. Parameters: `part=statistics&id={CHANNEL_ID}&key={API_KEY}`
4. ข้อมูลที่ได้: `subscriberCount`, `viewCount`, `videoCount`

**ขั้นตอน:**
1. สร้าง YouTube API Key ใน Google Cloud Console
2. เก็บ API Key ใน Environment Variables
3. สร้าง Cloud Function `fetchYouTubeStats(channelId)`
4. เรียกใช้ Function เมื่อโหลด Dashboard หรือ Schedule ทุก 1 ชม.
5. เก็บข้อมูลลง Firestore `users/{uid}/accounts/{accountId}`

**ตัวอย่าง Response:**
```json
{
  "items": [{
    "statistics": {
      "viewCount": "1234567",
      "subscriberCount": "12345",
      "videoCount": "100"
    }
  }]
}
```

**Firestore Schema ที่ต้องอัปเดต:**
```
accounts/{accountId}:
  - platform: "youtube"
  - channelId: "UCxxxxxxx"
  - subscribers: 12345
  - views: 1234567
  - videoCount: 100
  - lastUpdated: Timestamp
```

---

### Phase 3: Facebook/Instagram API
**ไฟล์ที่เกี่ยวข้อง:**
- `frontend/src/pages/Dashboard.jsx`
- `functions/index.js`

**Facebook Graph API:**
- Endpoint: `https://graph.facebook.com/v18.0/{page-id}?fields=followers_count,fan_count`
- ต้องใช้ Page Access Token
- ข้อมูล: `followers_count`, `fan_count`

**Instagram Graph API:**
- Endpoint: `https://graph.facebook.com/v18.0/{ig-user-id}?fields=followers_count,media_count`
- ต้องใช้ Instagram Business Account
- ข้อมูล: `followers_count`, `media_count`

**ขั้นตอน:**
1. สร้าง Facebook App ใน Meta Developer
2. ขอ `pages_read_engagement` permission
3. Generate Long-lived Page Access Token
4. สร้าง Cloud Function `fetchFacebookStats(pageId, accessToken)`
5. สร้าง Cloud Function `fetchInstagramStats(igUserId, accessToken)`

**หมายเหตุ:** Instagram API ต้องเป็น Business Account และเชื่อมกับ Facebook Page

---

### Phase 4: TikTok API (ใส่ UI ไว้ก่อน)
**สถานะ:** ใส่ UI ไว้ก่อน - ยังไม่เชื่อม API จริง

**TikTok API ข้อจำกัด:**
- ต้อง Apply เป็น TikTok Developer Partner
- มี Rate Limit สูง
- ต้องใช้ OAuth 2.0

**UI ที่ใส่ไว้:**
- แสดง Followers: 0
- แสดง Views: 0
- แสดง Videos: 0
- Badge: "Coming Soon" หรือ "API Pending"

---

## 📁 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| `frontend/src/pages/Dashboard.jsx` | หน้า Dashboard หลัก |
| `frontend/src/firebase.js` | Firebase Config |
| `functions/index.js` | Cloud Functions |
| `firestore.rules` | Security Rules |

---

## 🗃️ Firestore Schema ที่ต้องอัปเดต

### Collection: `users/{uid}/accounts/{accountId}`
```
{
  id: string,
  name: string,
  platform: "youtube" | "facebook" | "instagram" | "tiktok",
  
  // YouTube specific
  channelId?: string,
  
  // Facebook specific
  pageId?: string,
  accessToken?: string (encrypted),
  
  // Instagram specific
  igUserId?: string,
  
  // TikTok specific
  tiktokUserId?: string,
  
  // Stats (อัปเดตจาก API)
  followers: number,
  followersToday: number,
  views: number,
  viewsToday: number,
  videoCount: number,
  
  // Linked Projects
  projectIds: string[],
  
  // Metadata
  avatar?: string,
  lastUpdated: Timestamp,
  createdAt: Timestamp
}
```

### Collection: `users/{uid}/projects/{projectId}`
```
{
  id: string,
  name: string,
  status: "active" | "inactive",
  
  // Linked Accounts
  linkedAccounts: string[], // accountIds
  
  // Aggregated Stats (รวมจาก Accounts)
  subscribers: number,
  views: number,
  videoCount: number,
  followers: number,
  
  // Scheduling
  lastScheduled: Timestamp,
  
  // Metadata
  scenes: number,
  createdAt: Timestamp
}
```

---

## 🎯 Priority Order (ลำดับความสำคัญ)

1. **🔴 สูง** - Phase 1.1: เพิ่มคอลัมน์ Views (ง่าย, 10 นาที)
2. **🔴 สูง** - Phase 1.2: คลิก Project แสดง Platform (ปานกลาง, 30 นาที)
3. **🟡 กลาง** - Phase 2: YouTube API (ต้องมี API Key, 1-2 ชม.)
4. **🟡 กลาง** - Phase 3: Facebook/Instagram API (ต้องสร้าง App, 2-3 ชม.)
5. **🟢 ต่ำ** - Phase 4: TikTok API (รอ Apply, ใส่ UI ไว้ก่อน)

---

## 📝 Notes

- Dashboard ปัจจุบันใช้ Design แบบ FastClip.io
- สีหลัก: Dark Red Theme (`from-red-900 via-slate-900 to-slate-950`)
- ข้อมูลปัจจุบันยังเป็น 0 เพราะยังไม่เชื่อม API จริง
- ต้องสร้าง Cloud Functions สำหรับดึงข้อมูลจาก API ภายนอก
