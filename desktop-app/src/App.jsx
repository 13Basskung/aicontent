import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, CheckCircle, RefreshCw, Key, LogOut, Shield, Sparkles, Rocket, X } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [keyData, setKeyData] = useState(null);
  const [appInfo, setAppInfo] = useState({ version: '1.0.0', isDev: true });
  const [updateStatus, setUpdateStatus] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showReminder, setShowReminder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Get app info
      if (window.electronAPI) {
        const info = await window.electronAPI.getAppInfo();
        setAppInfo(info);

        // Check stored license key
        const storedKey = await window.electronAPI.store.get('licenseKey');
        if (storedKey) {
          const decoded = decodeKey(storedKey);
          if (decoded) {
            setKeyData(decoded);
            setIsLoggedIn(true);
          }
        }

        // Listen for update status
        window.electronAPI.onUpdateStatus((status) => {
          setUpdateStatus(status);
          // Show modal when update is downloaded
          if (status.status === 'downloaded') {
            setShowUpdateModal(true);
          }
        });

        // Listen for Google login reminder
        window.electronAPI.onGoogleLoginReminder((data) => {
          setShowReminder(data);
        });

        // Show antivirus warning on first launch
        const hideWarning = await window.electronAPI.store.get('hideAntivirusWarning');
        if (!hideWarning) {
          window.electronAPI.showAntivirusWarning();
        }
      }
    } catch (error) {
      console.error('Init error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Decode license key (base64 format: userId:ROLE:timestamp:random)
  function decodeKey(key) {
    try {
      const decoded = atob(key);
      const parts = decoded.split(':');
      if (parts.length >= 2) {
        return {
          userId: parts[0],
          isAdmin: parts[1] === 'ADMIN',
          timestamp: parts[2] || null,
          raw: key
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Handle login
  async function handleLogin(key) {
    const decoded = decodeKey(key.trim());
    if (!decoded) {
      return { success: false, message: 'รูปแบบ Key ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
    }

    // Store key
    if (window.electronAPI) {
      await window.electronAPI.store.set('licenseKey', key.trim());
    }

    setKeyData(decoded);
    setIsLoggedIn(true);
    return { success: true };
  }

  // Handle logout
  async function handleLogout() {
    if (window.electronAPI) {
      await window.electronAPI.store.delete('licenseKey');
    }
    setKeyData(null);
    setIsLoggedIn(false);
  }

  // Check for updates
  function checkForUpdates() {
    if (window.electronAPI) {
      window.electronAPI.checkForUpdates();
    }
  }

  // Install update
  function installUpdate() {
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="glass border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">▶</span>
          </div>
          <div>
            <h1 className="text-white font-semibold">Content Auto Post</h1>
            <p className="text-white/50 text-xs">Desktop Agent v{appInfo.version}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Update Status */}
          {updateStatus && (
            <UpdateBadge status={updateStatus} onInstall={installUpdate} />
          )}

          {/* Check Updates Button */}
          <button
            onClick={checkForUpdates}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
            title="ตรวจสอบอัพเดท"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/70 hover:text-red-400 transition"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Google Login Reminder */}
      {showReminder && (
        <div className="mx-4 mt-4">
          <div className="glass rounded-lg p-4 border border-yellow-500/30 bg-yellow-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-200 font-medium">แนะนำให้ Login Google ใหม่</p>
                <p className="text-yellow-200/70 text-sm mt-1">{showReminder.message}</p>
              </div>
              <button
                onClick={() => setShowReminder(null)}
                className="text-yellow-400/70 hover:text-yellow-400"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-4">
        {isLoggedIn ? (
          <Dashboard keyData={keyData} />
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )}
      </main>

      {/* Custom Update Modal */}
      {showUpdateModal && updateStatus?.status === 'downloaded' && (
        <UpdateModal 
          version={updateStatus.version}
          releaseNotes={updateStatus.releaseNotes}
          onInstall={installUpdate}
          onLater={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  );
}

// Update Badge Component
function UpdateBadge({ status, onInstall }) {
  if (status.status === 'checking') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-sm">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>กำลังตรวจสอบ...</span>
      </div>
    );
  }

  if (status.status === 'available') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-300 text-sm">
        <Download className="w-3 h-3" />
        <span>มี v{status.version}</span>
      </div>
    );
  }

  if (status.status === 'downloading') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-sm">
        <Download className="w-3 h-3 animate-bounce" />
        <span>กำลังดาวน์โหลด {status.percent}%</span>
      </div>
    );
  }

  if (status.status === 'downloaded') {
    return (
      <button
        onClick={onInstall}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/30 hover:bg-green-500/40 text-green-300 text-sm transition"
      >
        <CheckCircle className="w-3 h-3" />
        <span>ติดตั้ง v{status.version}</span>
      </button>
    );
  }

  if (status.status === 'up-to-date') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/50 text-sm">
        <CheckCircle className="w-3 h-3" />
        <span>เวอร์ชันล่าสุด</span>
      </div>
    );
  }

  return null;
}

// Version changelog - ข้อมูลที่แก้ไขจริงในแต่ละเวอร์ชัน
const VERSION_CHANGELOG = {
  '1.6.3': [
    { title: 'Clear Steps', desc: 'Steps หายไปทันทีหลังบันทึกสำเร็จ' },
    { title: 'Drag & Drop', desc: 'ลาก Step ไปวางตำแหน่งอื่นได้' },
    { title: 'ภาษาไทย', desc: 'เปลี่ยน dropdown action เป็นภาษาไทย (คลิก, พิมพ์, รอ, ไปที่ URL)' },
  ],
  '1.6.2': [
    { title: 'แก้ไข Steps', desc: 'กดปุ่มแก้ไขบน Block แล้วโหลด Steps ไปยังกล่อง Step เพื่อแก้ไขได้' },
    { title: 'URL Dropdown', desc: 'URL เริ่มต้นเป็น dropdown พร้อมเพิ่ม/ลบ URL ได้' },
    { title: 'ปุ่ม Hover', desc: 'ปุ่มทดสอบ/แก้ไข/ลบ แสดงเมื่อ hover (เหมือน v1.6.0)' },
  ],
  '1.6.1': [
    { title: 'ปุ่มแสดงตลอด', desc: 'ปุ่มทดสอบ/แก้ไข/ลบ แสดงตลอดเวลา ไม่ต้อง hover' },
    { title: 'VDO Blocks', desc: 'เปลี่ยนชื่อ "สร้างวีดีโอ" เป็น "VDO Blocks"' },
    { title: 'Instance Link', desc: 'เชื่อม Instance ที่เลือกกับปุ่มทดสอบ Block' },
  ],
  '1.6.0': [
    { title: 'Block Types', desc: 'แยก Block เป็น 2 ประเภท: สร้างวีดีโอ + Platform Blocks' },
    { title: '2-Column Layout', desc: 'Admin เห็น Available Blocks แยก 2 ฝั่ง (ซ้าย=วีดีโอ, ขวา=Platform)' },
    { title: 'Platform Colors', desc: 'สี Block ตาม Platform (YT=แดง, TT=ดำ, FB=ฟ้า, IG=ม่วง-ชมพู)' },
    { title: 'Edit Block', desc: 'แก้ไข Block พร้อมเลือก อัปเดตทับ หรือ สร้างใหม่' },
    { title: 'Test Block', desc: 'ปุ่มทดสอบ Block (รันจริง)' },
  ],
  '1.5.7': [
    { title: 'Recorder Save', desc: 'บันทึก Block ไป Firestore และแสดงใน Available Blocks ทันที' },
  ],
  '1.5.6': [
    { title: 'Block Permissions', desc: 'Instances tab - view only, Recorder tab - Edit/Delete (Admin)' },
  ],
  '1.5.5': [
    { title: 'Firestore Rules', desc: 'แก้ไข permissions สำหรับ instance_settings' },
    { title: 'Block Description', desc: 'Popup แสดงรายละเอียดของ Block ที่เคยตั้งค่าไว้' },
  ],
  '1.5.4': [
    { title: 'Block Selection', desc: 'Popup ยืนยันและบันทึกลง Firestore ถาวร' },
    { title: 'Persistence', desc: 'Block ที่เลือกไม่รีเซตเมื่ออัพเดทหรือรีสตาร์ท' },
  ],
  '1.5.3': [
    { title: 'Block Selection', desc: 'บันทึก Block ที่เลือกไว้ ไม่รีเซตเมื่ออัพเดท' },
  ],
  '1.5.2': [
    { title: 'UI Cleanup', desc: 'ย้าย Tabs ไปใต้ Admin Mode, ซ่อน Projects/Blocks ใน Scheduler' },
    { title: 'Recorder Tab', desc: 'แสดงเฉพาะ Admin เท่านั้น' },
  ],
  '1.5.1': [
    { title: 'Timezone Dropdown', desc: 'แสดงเหนือปุ่มเพื่อให้เห็นรายละเอียดชัดเจน' },
  ],
  '1.5.0': [
    { title: 'Timezone Dropdown', desc: 'แสดง timezone ที่เลือกไว้บนสุดของรายการ' },
    { title: 'Update Popup', desc: 'แสดงหัวข้อและคำอธิบายการแก้ไขจริง' },
    { title: 'Flag Icons', desc: 'ธงชาติแบบ CSS แสดงได้ทุกเครื่อง' },
  ],
  '1.4.9': [
    { title: 'Timezone Dropdown', desc: 'แสดง timezone ที่เลือกไว้บนสุดของรายการ' },
    { title: 'Update Popup', desc: 'แสดงรายละเอียดการแก้ไขจริงในแต่ละเวอร์ชัน' },
  ],
  '1.4.8': [
    { title: 'Flag Icons', desc: 'ธงชาติแบบ CSS แสดงได้ทุกเครื่อง' },
    { title: 'Timezone Time', desc: 'คำนวณเวลาตาม offset ถูกต้อง 100%' },
  ],
  '1.4.7': [
    { title: 'SVG Flags', desc: 'เปลี่ยนเป็น Base64 encoding' },
  ],
  '1.4.6': [
    { title: 'Update Modal', desc: 'เปลี่ยนจาก native dialog เป็น custom modal สวยงาม' },
    { title: 'Toast Notification', desc: 'แทน alert สีขาวด้วย toast ตรงธีม' },
  ],
};

// Custom Update Modal Component (Beautiful Dark Theme)
function UpdateModal({ version, releaseNotes, onInstall, onLater }) {
  // Get changelog for this version
  const getChangelogItems = () => {
    // Check if we have predefined changelog for this version
    if (VERSION_CHANGELOG[version]) {
      return VERSION_CHANGELOG[version];
    }
    
    // Try to parse release notes from GitHub
    if (releaseNotes && releaseNotes.trim()) {
      const lines = releaseNotes.split('\n').filter(line => line.trim());
      return lines.slice(0, 5).map(line => ({
        title: 'Update',
        desc: line.replace(/^[-*•]\s*/, '').trim()
      }));
    }
    
    // Default fallback
    return [
      { title: 'Bug Fixes', desc: 'แก้ไขข้อบกพร่องและปรับปรุงประสิทธิภาพ' },
      { title: 'UI/UX', desc: 'ปรับปรุงหน้าตาและการใช้งานให้ดีขึ้น' },
    ];
  };

  const changelog = getChangelogItems();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] animate-fadeIn">
      <div className="glass rounded-3xl p-8 max-w-lg w-full mx-4 border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">อัพเดทพร้อมแล้ว!</h2>
              <p className="text-white/60 text-sm">Version {version}</p>
            </div>
          </div>
          <button 
            onClick={onLater}
            className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Changelog Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h3 className="text-white/80 font-medium">มีอะไรใหม่ใน v{version}</h3>
          </div>
          <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
            {changelog.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0"></div>
                <div>
                  <span className="text-white font-medium text-sm">{item.title}</span>
                  <p className="text-white/50 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-6">
          <p className="text-blue-300/80 text-xs text-center">
            💡 แอปจะรีสตาร์ทเพื่อติดตั้งเวอร์ชันใหม่
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onLater}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl font-medium transition"
          >
            ภายหลัง
          </button>
          <button
            onClick={onInstall}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            อัพเดทเลย
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
