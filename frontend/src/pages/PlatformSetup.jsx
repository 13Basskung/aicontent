import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    ArrowLeft, Youtube, Facebook, Instagram, Video, CheckCircle, AlertCircle, 
    ExternalLink, Copy, Key, Globe, Shield, Loader2, RefreshCw
} from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Platform Configuration
const PLATFORM_CONFIG = {
    youtube: {
        name: 'YouTube',
        icon: Youtube,
        color: 'red',
        bgGradient: 'from-red-600 to-red-800',
        description: 'เชื่อมต่อ YouTube Channel เพื่อดึงข้อมูล Subscribers, Views และอัพโหลดวิดีโอ',
        consoleUrl: 'https://console.cloud.google.com/apis/credentials',
        docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
        steps: [
            'ไปที่ Google Cloud Console และสร้าง Project ใหม่',
            'เปิดใช้งาน YouTube Data API v3',
            'สร้าง OAuth 2.0 Client ID (Web Application)',
            'เพิ่ม Redirect URI: ' + window.location.origin + '/api/auth/youtube/callback',
            'คัดลอก Client ID และ Client Secret มาใส่ด้านล่าง'
        ],
        fields: [
            { id: 'clientId', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text' },
            { id: 'clientSecret', label: 'Client Secret', placeholder: 'GOCSPX-xxxxxxxxx', type: 'password' },
            { id: 'channelId', label: 'Channel ID (Optional)', placeholder: 'UCxxxxxxxxxx', type: 'text' }
        ]
    },
    facebook: {
        name: 'Facebook',
        icon: Facebook,
        color: 'blue',
        bgGradient: 'from-blue-600 to-blue-800',
        description: 'เชื่อมต่อ Facebook Page เพื่อดึงข้อมูล Followers และโพสต์อัตโนมัติ',
        consoleUrl: 'https://developers.facebook.com/apps/',
        docsUrl: 'https://developers.facebook.com/docs/facebook-login/',
        steps: [
            'ไปที่ Meta Developer Portal และสร้าง App ใหม่',
            'เลือก Business Type และตั้งค่า App',
            'ไปที่ Facebook Login > Settings',
            'เพิ่ม Valid OAuth Redirect URI: ' + window.location.origin + '/api/auth/facebook/callback',
            'คัดลอก App ID และ App Secret มาใส่ด้านล่าง'
        ],
        fields: [
            { id: 'appId', label: 'App ID', placeholder: '1234567890', type: 'text' },
            { id: 'appSecret', label: 'App Secret', placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' },
            { id: 'pageId', label: 'Page ID (Optional)', placeholder: '1234567890', type: 'text' }
        ]
    },
    instagram: {
        name: 'Instagram',
        icon: Instagram,
        color: 'pink',
        bgGradient: 'from-pink-600 to-purple-800',
        description: 'เชื่อมต่อ Instagram Business Account (ต้องเชื่อมกับ Facebook Page)',
        consoleUrl: 'https://developers.facebook.com/apps/',
        docsUrl: 'https://developers.facebook.com/docs/instagram-api/',
        steps: [
            'ต้องมี Facebook Page ที่เชื่อมกับ Instagram Business Account',
            'ไปที่ Meta Developer Portal → App ที่สร้างไว้',
            'เพิ่ม Instagram Basic Display หรือ Instagram Graph API',
            'ตั้งค่า OAuth และ Redirect URI',
            'ใช้ App ID และ Secret เดียวกับ Facebook'
        ],
        fields: [
            { id: 'appId', label: 'Facebook App ID', placeholder: '1234567890', type: 'text' },
            { id: 'appSecret', label: 'Facebook App Secret', placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' },
            { id: 'igUserId', label: 'Instagram User ID (Optional)', placeholder: '17841400000000', type: 'text' }
        ]
    },
    tiktok: {
        name: 'TikTok',
        icon: Video,
        color: 'cyan',
        bgGradient: 'from-cyan-600 to-teal-800',
        description: 'เชื่อมต่อ TikTok Account สำหรับอัพโหลดวิดีโอ (ต้อง Apply เป็น Developer)',
        consoleUrl: 'https://developers.tiktok.com/',
        docsUrl: 'https://developers.tiktok.com/doc/login-kit-web/',
        steps: [
            'ไปที่ TikTok Developer Portal และ Apply เป็น Developer',
            'สร้าง App ใหม่และรอ Approval (อาจใช้เวลา 1-3 วัน)',
            'เมื่อ Approved แล้ว ตั้งค่า Login Kit',
            'เพิ่ม Redirect URI: ' + window.location.origin + '/api/auth/tiktok/callback',
            'คัดลอก Client Key และ Client Secret มาใส่ด้านล่าง'
        ],
        fields: [
            { id: 'clientKey', label: 'Client Key', placeholder: 'awxxxxxxxxxx', type: 'text' },
            { id: 'clientSecret', label: 'Client Secret', placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' }
        ],
        warning: 'TikTok API ต้อง Apply และรอ Approval ก่อนใช้งาน'
    }
};

export default function PlatformSetup() {
    const { platform, accountId } = useParams();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({});
    const [toast, setToast] = useState({ message: '', type: '', visible: false });
    
    const config = PLATFORM_CONFIG[platform?.toLowerCase()];
    const Icon = config?.icon || Globe;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user && accountId) {
                // Fetch account data
                const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);
                const accountSnap = await getDoc(accountRef);
                if (accountSnap.exists()) {
                    const data = accountSnap.data();
                    setAccount({ id: accountSnap.id, ...data });
                    // Pre-fill form with existing data
                    const initialData = {};
                    config?.fields?.forEach(field => {
                        initialData[field.id] = data[field.id] || '';
                    });
                    setFormData(initialData);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [accountId, platform]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast({ ...toast, visible: false }), 3000);
    };

    const handleSave = async () => {
        if (!currentUser || !accountId) return;
        
        setSaving(true);
        try {
            const accountRef = doc(db, 'users', currentUser.uid, 'accounts', accountId);
            await updateDoc(accountRef, {
                ...formData,
                setupComplete: true,
                updatedAt: new Date()
            });
            showToast('บันทึกการตั้งค่าเรียบร้อย!', 'success');
        } catch (error) {
            console.error('Error saving:', error);
            showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        showToast('กำลังทดสอบการเชื่อมต่อ... (Coming Soon)', 'info');
        // TODO: Implement actual OAuth test
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast('คัดลอกแล้ว!', 'success');
    };

    if (!config) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center text-white">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                    <h1 className="text-2xl font-bold mb-2">Platform ไม่ถูกต้อง</h1>
                    <Link to="/platforms" className="text-red-400 hover:underline">← กลับหน้า Platforms</Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 p-4 md:p-8">
            {/* Toast */}
            {toast.visible && (
                <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-4 ${
                    toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                } text-white`}>
                    <CheckCircle size={20} />
                    <span className="font-bold">{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="max-w-4xl mx-auto">
                <Link to="/platforms" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft size={20} /> กลับหน้า Platforms
                </Link>

                <div className={`bg-gradient-to-r ${config.bgGradient} rounded-2xl p-6 mb-8 flex items-center gap-4`}>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Icon size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white">ตั้งค่า {config.name}</h1>
                        <p className="text-white/80 text-sm mt-1">{config.description}</p>
                    </div>
                </div>

                {/* Account Info */}
                {account && (
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6 flex items-center gap-4">
                        <img src={account.avatar} alt={account.name} className="w-12 h-12 rounded-xl border-2 border-white/20" />
                        <div>
                            <p className="text-white font-bold">{account.name}</p>
                            <p className="text-slate-400 text-sm">Account ID: {account.id}</p>
                        </div>
                    </div>
                )}

                {/* Warning for TikTok */}
                {config.warning && (
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
                        <p className="text-yellow-300 text-sm">{config.warning}</p>
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Steps */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Shield size={20} className={`text-${config.color}-400`} />
                            ขั้นตอนการตั้งค่า
                        </h2>
                        
                        <ol className="space-y-3">
                            {config.steps.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <span className={`w-6 h-6 rounded-full bg-${config.color}-500/20 text-${config.color}-400 flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                                        {idx + 1}
                                    </span>
                                    <span className="text-slate-300 text-sm">{step}</span>
                                </li>
                            ))}
                        </ol>

                        <div className="mt-6 pt-4 border-t border-white/10">
                            <p className="text-slate-400 text-xs mb-3">Redirect URI (คัดลอกไปใส่ใน Developer Console):</p>
                            <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3">
                                <code className="text-green-400 text-xs flex-1 break-all">
                                    {window.location.origin}/api/auth/{platform}/callback
                                </code>
                                <button 
                                    onClick={() => copyToClipboard(`${window.location.origin}/api/auth/${platform}/callback`)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <Copy size={14} className="text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <a 
                                href={config.consoleUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex-1 py-3 flex items-center justify-center gap-2 bg-${config.color}-500 hover:bg-${config.color}-400 text-white font-bold rounded-xl transition-all text-sm`}
                            >
                                <ExternalLink size={16} /> เปิด Developer Console
                            </a>
                            <a 
                                href={config.docsUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-4 py-3 border border-white/20 hover:bg-white/10 text-white rounded-xl transition-all text-sm"
                            >
                                Docs
                            </a>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Key size={20} className={`text-${config.color}-400`} />
                            API Credentials
                        </h2>

                        <div className="space-y-4">
                            {config.fields.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm text-slate-400 mb-2">{field.label}</label>
                                    <input
                                        type={field.type}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                        placeholder={field.placeholder}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`flex-1 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50`}
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                บันทึกการตั้งค่า
                            </button>
                            <button
                                onClick={handleTestConnection}
                                className="px-4 py-3 border border-white/20 hover:bg-white/10 text-white rounded-xl transition-all flex items-center gap-2"
                            >
                                <RefreshCw size={16} /> ทดสอบ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
