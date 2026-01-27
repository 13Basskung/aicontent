import { useState, useEffect } from 'react';
import { Youtube, Facebook, Instagram, Music2, Save, AlertCircle, CheckCircle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'red',
    bgGradient: 'from-orange-600 to-red-800',
    fields: [
      { id: 'clientId', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text' },
      { id: 'clientSecret', label: 'Client Secret', placeholder: 'GOCSPX-xxxxxxxxx', type: 'password' }
    ],
    consoleUrl: 'https://console.cloud.google.com/auth/clients?project=content-auto-post',
    enableApiUrl: 'https://console.cloud.google.com/apis/api/youtube.googleapis.com/metrics?project=content-auto-post',
    docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
    steps: [
      'กดปุ่ม "Enable API" เพื่อเปิดใช้งาน YouTube Data API v3 จะมีหน้าต่างเปิดขึ้นมาให้กดคำว่า Enable',
      'กดปุ่ม "Developer Console" เพื่อสร้าง OAuth 2.0 Client ID จะมีหน้าต่างเปิดขึ้นมา',
      'กดคำว่า Create client และเลือก Application type เป็น Web Application',
      'ช่อง Name ใส่ชื่ออะไรก็ได้ ในหัวข้อ Authorized redirect URIs ให้กด +Add URI',
      'Copy URL ด้านล่างนี้ไปใส่ช่อง URIs 1*',
      'กด Create จะได้ Client ID และ Client Secret ไปกรอกช่องด้านขวา'
    ],
    copyUrl: 'https://aicontents.vip/oauth/callback',
    copyUrlStep: 4
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'blue',
    bgGradient: 'from-orange-600 to-blue-800',
    fields: [
      { id: 'appId', label: 'App ID', placeholder: '1234567890', type: 'text' },
      { id: 'appSecret', label: 'App Secret', placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' }
    ],
    consoleUrl: 'https://developers.facebook.com/apps/create/',
    enableApiUrl: 'https://developers.facebook.com/apps/',
    docsUrl: 'https://developers.facebook.com/docs/facebook-login/',
    steps: [
      'กดปุ่ม Developer Console ด้านล่าง',
      'เลือกผู้บริโภค และ กดถัดไป',
      'กรอกชื่อแอพ และ กรอกอีเมลติดต่อของแอพ กดสร้างแอพ ระบบจะให้ใส่รหัสผ่านบัญชี Facebook (ให้กรอกรหัสผ่านให้ถูกต้อง) กดส่ง จะเจอหน้าแอพของฉัน',
      'กดเมนูซ้ายมือ การตั้งค่าแอพ เลือกข้อมูลพื้นฐาน ช่องข้อมูลลับของแอพ ให้กดแสดง และกดบันทึกการเปลี่ยนแปลง',
      'กดไปที่กล่อง Setting ในกล่อง Facebook Login',
      'ช่อง "Site URL" → ใส่: https://aicontents.vip กด Save กด Continue กด Next ไปเรื่อยๆ จนถึงขั้นตอนที่ 5',
      'ดูเมนูซ้ายเลือกเมนู การเข้าสู่ระบบ Facebook เลือกการตั้งค่า',
      'เลื่อนลงมาดูที่ช่อง Valid OAuth Redirect URIs Copy ลิงก์ https://aicontents.vip/oauth/callback ไปใส่',
      'เลื่อนลงไปล่างสุด → กด "Save changes" (ปุ่มสีน้ำเงิน)',
      'ดูเมนูซ้ายเลือก การตั้งค่าแอพ เลือกข้อมูลพื้นฐาน ช่องข้อมูลลับของแอพ ให้กดแสดง',
      'ช่องโดเมนของแอพ ให้ใส่: https://aicontents.vip และ aicontents.vip',
      'ช่อง URL นโยบายความเป็นส่วนตัว ให้ใส่: https://aicontents.vip/privacy-policy',
      'ช่อง URL ข้อกำหนดของบริการ ให้ใส่: https://aicontents.vip/terms-of-service',
      'ช่องการลบข้อมูลผู้ใช้ ให้เลือก URL คำแนะนำการลบข้อมูล และให้ใส่: https://aicontents.vip/data-deletion เสร็จแล้วกดบันทึกการเปลี่ยนแปลง',
      'โหมดแอพด้านบน ให้เปิดใช้งาน (สังเกตจะเป็นปุ่มสีฟ้า)',
      'Copy ข้อมูล App ID และ App Secret มาใส่ด้านล่าง → กด Save'
    ]
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'pink',
    bgGradient: 'from-orange-600 to-pink-800',
    fields: [
      { id: 'appId', label: 'App ID (Facebook)', placeholder: '1234567890', type: 'text' },
      { id: 'appSecret', label: 'App Secret (Facebook)', placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' }
    ],
    consoleUrl: 'https://developers.facebook.com/apps/',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/',
    steps: [
      'Instagram ใช้ Facebook App เดียวกัน',
      'ไปที่ Facebook Developer Console',
      'เลือก App ที่สร้างไว้ → เพิ่มผลิตภัณฑ์ "Instagram Basic Display"',
      'ตั้งค่า Redirect URI: https://aicontents.vip/oauth/callback',
      'Copy App ID และ App Secret มาใส่ด้านล่าง → กด Save'
    ]
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    color: 'cyan',
    bgGradient: 'from-cyan-600 to-pink-800',
    fields: [
      { id: 'clientKey', label: 'Client Key', placeholder: 'aw1234567890', type: 'text' },
      { id: 'clientSecret', label: 'Client Secret', placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' }
    ],
    consoleUrl: 'https://developers.tiktok.com/apps',
    docsUrl: 'https://developers.tiktok.com/doc/login-kit-web',
    steps: [
      'ไปที่ TikTok Developer Portal',
      'สร้าง App ใหม่ → เลือก "Login Kit"',
      'ตั้งค่า Redirect URI: https://aicontents.vip/oauth/callback',
      'Copy Client Key และ Client Secret มาใส่ด้านล่าง → กด Save'
    ]
  }
];

export default function AppSettings() {
  const [selectedPlatform, setSelectedPlatform] = useState('youtube');
  const [formData, setFormData] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform);

  useEffect(() => {
    loadSettings();
  }, [selectedPlatform]);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'appSettings', selectedPlatform);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setFormData(docSnap.data());
      } else {
        setFormData({});
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveStatus(null);

    try {
      const docRef = doc(db, 'appSettings', selectedPlatform);
      await setDoc(docRef, {
        ...formData,
        updatedAt: new Date().toISOString(),
        updatedBy: 'fxfarm.dashboard@gmail.com'
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">App Settings</h1>
          <p className="text-slate-400">ตั้งค่า API Credentials สำหรับแต่ละแพลตฟอร์ม (Admin Only)</p>
        </div>

        {/* Platform Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            return (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                  selectedPlatform === platform.id
                    ? `bg-gradient-to-r ${platform.bgGradient} text-white shadow-lg`
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                <Icon size={20} />
                {platform.name}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Setup Steps */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">ขั้นตอนการตั้งค่า</h2>
            
            <ol className="space-y-3 mb-6">
              {currentPlatform.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className={`w-6 h-6 rounded-full bg-${currentPlatform.color}-500/20 text-${currentPlatform.color}-400 flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {idx + 1}
                  </span>
                  <div className="text-slate-300 text-sm">
                    {step}
                    {/* Copy URL Box for YouTube step 5 (idx=4) */}
                    {selectedPlatform === 'youtube' && idx === 4 && (
                      <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <code className="text-green-400 text-xs flex-1 break-all">
                          https://aicontents.vip/oauth/callback
                        </code>
                        <button 
                          onClick={() => copyToClipboard('https://aicontents.vip/oauth/callback')}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          title="คัดลอก"
                        >
                          <Copy size={12} className="text-slate-400" />
                        </button>
                      </div>
                    )}
                    {/* Copy URL Box for Facebook step 6 (idx=5) - Site URL */}
                    {selectedPlatform === 'facebook' && idx === 5 && (
                      <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <code className="text-green-400 text-xs flex-1 break-all">
                          https://aicontents.vip
                        </code>
                        <button 
                          onClick={() => copyToClipboard('https://aicontents.vip')}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          title="คัดลอก"
                        >
                          <Copy size={12} className="text-slate-400" />
                        </button>
                      </div>
                    )}
                    {/* Copy URL Box for Facebook step 8 (idx=7) - Redirect URI */}
                    {selectedPlatform === 'facebook' && idx === 7 && (
                      <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <code className="text-green-400 text-xs flex-1 break-all">
                          https://aicontents.vip/oauth/callback
                        </code>
                        <button 
                          onClick={() => copyToClipboard('https://aicontents.vip/oauth/callback')}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          title="คัดลอก"
                        >
                          <Copy size={12} className="text-slate-400" />
                        </button>
                      </div>
                    )}
                    {/* Copy URL Box for Facebook step 11 (idx=10) - App Domain */}
                    {selectedPlatform === 'facebook' && idx === 10 && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                          <code className="text-green-400 text-xs flex-1 break-all">
                            https://aicontents.vip
                          </code>
                          <button 
                            onClick={() => copyToClipboard('https://aicontents.vip')}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="คัดลอก"
                          >
                            <Copy size={12} className="text-slate-400" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                          <code className="text-green-400 text-xs flex-1 break-all">
                            aicontents.vip
                          </code>
                          <button 
                            onClick={() => copyToClipboard('aicontents.vip')}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="คัดลอก"
                          >
                            <Copy size={12} className="text-slate-400" />
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Copy URL Box for Facebook step 12 (idx=11) - Privacy Policy */}
                    {selectedPlatform === 'facebook' && idx === 11 && (
                      <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <code className="text-green-400 text-xs flex-1 break-all">
                          https://aicontents.vip/privacy-policy
                        </code>
                        <button 
                          onClick={() => copyToClipboard('https://aicontents.vip/privacy-policy')}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          title="คัดลอก"
                        >
                          <Copy size={12} className="text-slate-400" />
                        </button>
                      </div>
                    )}
                    {/* Copy URL Box for Facebook step 13 (idx=12) - Terms of Service */}
                    {selectedPlatform === 'facebook' && idx === 12 && (
                      <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <code className="text-green-400 text-xs flex-1 break-all">
                          https://aicontents.vip/terms-of-service
                        </code>
                        <button 
                          onClick={() => copyToClipboard('https://aicontents.vip/terms-of-service')}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          title="คัดลอก"
                        >
                          <Copy size={12} className="text-slate-400" />
                        </button>
                      </div>
                    )}
                    {/* Copy URL Box for Facebook step 14 (idx=13) - Data Deletion */}
                    {selectedPlatform === 'facebook' && idx === 13 && (
                      <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <code className="text-green-400 text-xs flex-1 break-all">
                          https://aicontents.vip/data-deletion
                        </code>
                        <button 
                          onClick={() => copyToClipboard('https://aicontents.vip/data-deletion')}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          title="คัดลอก"
                        >
                          <Copy size={12} className="text-slate-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-white/10">
              {currentPlatform.enableApiUrl && (
                <a
                  href={currentPlatform.enableApiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl transition-all text-green-400 hover:text-green-300"
                >
                  <CheckCircle size={20} />
                  <span className="text-xs font-semibold">Enable API</span>
                </a>
              )}
              <a
                href={currentPlatform.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl transition-all text-orange-400 hover:text-orange-300"
              >
                <ExternalLink size={20} />
                <span className="text-xs font-semibold">Developer Console</span>
              </a>
              {currentPlatform.docsUrl && (
                <a
                  href={currentPlatform.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-all text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink size={20} />
                  <span className="text-xs font-semibold">Docs</span>
                </a>
              )}
            </div>
          </div>

          {/* Right: Form */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">API Credentials</h2>

            <div className="space-y-4">
              {currentPlatform.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets[field.id] ? 'text' : field.type}
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                    {field.type === 'password' && (
                      <button
                        onClick={() => setShowSecrets({ ...showSecrets, [field.id]: !showSecrets[field.id] })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showSecrets[field.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  loading
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500 shadow-lg'
                }`}
              >
                <Save size={20} />
                {loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>

              {/* Status Messages */}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400">
                  <CheckCircle size={18} />
                  <span className="text-sm">บันทึกสำเร็จ!</span>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                  <AlertCircle size={18} />
                  <span className="text-sm">เกิดข้อผิดพลาด กรุณาลองใหม่</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
