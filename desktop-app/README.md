# Content Auto Post - Desktop Agent

Desktop Application สำหรับ Automate การสร้างเนื้อหาด้วย Playwright

## ✨ Features

- 🔑 **Key-based Login** - ใช้ License Key จากเว็บไซต์
- 📁 **Project Management** - เลือกและจัดการ Projects
- 🖥️ **Multi-Chrome Instance** - รันหลาย Chrome พร้อมกัน
- 🔄 **Auto-Update** - อัพเดทอัตโนมัติผ่าน GitHub Releases
- 🎭 **Playwright Automation** - เสถียรกว่า Extension

## 🚀 Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Start development
npm run dev
```

## 📦 Build for Production

```bash
# Build .exe installer
npm run build

# Build and publish to GitHub Releases
npm run electron:publish
```

## 📁 Project Structure

```
desktop-app/
├── electron/           # Electron main process
│   ├── main.js        # Main entry point
│   └── preload.js     # Preload script (IPC bridge)
├── src/               # React frontend
│   ├── components/    # UI components
│   ├── lib/           # Utilities (Firebase, etc.)
│   ├── App.jsx        # Main App component
│   └── main.jsx       # React entry point
├── assets/            # Icons and images
├── package.json       # Dependencies & scripts
└── vite.config.js     # Vite configuration
```

## ⚠️ Requirements

- **Node.js** 18+ (for development)
- **Windows** 10/11 (for running)
- **Antivirus**: แนะนำให้ปิดก่อนใช้งาน

## 🔧 Configuration

License Key format: `base64(userId:ROLE:timestamp:random)`

## 📝 Notes

- Chrome จะเปิดให้เห็น (ไม่ใช่ Headless) เพราะ Google Vids ตรวจจับ bot
- ระบบจะแจ้งเตือนทุก 3 วันให้ Login Google ใหม่
- Profile Chrome จะถูกเก็บไว้ใน `profiles/` folder

## 📄 License

MIT
