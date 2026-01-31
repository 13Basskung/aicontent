import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, CheckCircle, RefreshCw, Key, LogOut, Shield } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [keyData, setKeyData] = useState(null);
  const [appInfo, setAppInfo] = useState({ version: '1.0.0', isDev: true });
  const [updateStatus, setUpdateStatus] = useState(null);
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

export default App;
