import React, { useState } from 'react';
import { Key, AlertCircle, Shield, ExternalLink } from 'lucide-react';

function LoginScreen({ onLogin }) {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError('กรุณาใส่ License Key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await onLogin(keyInput);
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
            <span className="text-white text-4xl">▶</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Content Auto Post</h1>
          <p className="text-white/50">Desktop Agent สำหรับ Automate การสร้างเนื้อหา</p>
        </div>

        {/* Login Form */}
        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-white/70 text-sm font-medium mb-2">
                License Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="ใส่ Key ที่ได้จากเว็บไซต์"
                  className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>

          {/* Help Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                if (window.electronAPI?.openExternal) {
                  window.electronAPI.openExternal('https://aicontents.vip/');
                } else {
                  window.open('https://aicontents.vip/', '_blank');
                }
              }}
              className="text-white/50 hover:text-white/70 text-sm inline-flex items-center gap-1 transition"
            >
              <ExternalLink className="w-3 h-3" />
              ยังไม่มี Key? สมัครที่เว็บไซต์
            </button>
          </div>
        </div>

        {/* Antivirus Notice */}
        <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-200 font-medium text-sm">คำแนะนำ: ปิด Antivirus</p>
              <p className="text-yellow-200/60 text-xs mt-1">
                บาง Antivirus อาจ block การทำงานของระบบ Automate
                แนะนำให้ปิดก่อนใช้งานเพื่อให้ทำงานได้ราบรื่น
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
