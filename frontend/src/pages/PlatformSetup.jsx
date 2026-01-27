import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    ArrowLeft, Youtube, Facebook, Instagram, Video, CheckCircle, AlertCircle, 
    ExternalLink, Copy, Key, Globe, Shield, Loader2, RefreshCw, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Platform Configuration
const PLATFORM_CONFIG = {
    youtube: {
        name: 'YouTube',
        icon: Youtube,
        color: 'orange',
        bgGradient: 'from-orange-600 to-red-800',
        description: 'เชื่อมต่อ YouTube Channel เพื่อดึงข้อมูล Subscribers, Views และอัพโหลดวิดีโอ',
        consoleUrl: 'https://console.cloud.google.com/auth/clients?project=content-auto-post',
        enableApiUrl: 'https://console.cloud.google.com/apis/api/youtube.googleapis.com/metrics?project=content-auto-post',
        docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
        channelSelectUrl: 'https://www.youtube.com/channel_switcher',
        steps: [
            'กดปุ่ม "Enable API" เพื่อเปิดใช้งาน YouTube Data API v3 จะมีหน้าต่างเปิดขึ้นมาให้กดคำว่า Enable',
            'กดปุ่ม "Developer Console" เพื่อสร้าง OAuth 2.0 Client ID จะมีหน้าต่างเปิดขึ้นมา',
            'กดคำว่า Create client และเลือก Application type เป็น Web Application',
            'ช่อง Name ใส่ชื่ออะไรก็ได้ ในหัวข้อ Authorized redirect URIs ให้กด +Add URI',
            'Copy URL ด้านล่างนี้ไปใส่ช่อง URIs 1*',
            'กด Create จะได้ Client ID และ Client Secret ไปกรอกช่องด้านขวา'
        ],
        fields: [
            { id: 'clientId', label: 'Client ID', placeholder: 'xxxx.apps.googleusercontent.com', type: 'text' },
            { id: 'clientSecret', label: 'Client Secret', placeholder: 'GOCSPX-xxxxxxxxx', type: 'password' },
            { id: 'channelId', label: 'Channel ID (Optional)', placeholder: 'UCxxxxxxxxxx', type: 'text', hasHelp: true }
        ],
        channelIdHelp: [
            { text: 'กดลิงก์นี้เพื่อไปหน้า YouTube เลือกบัญชี', link: 'https://www.youtube.com/channel_switcher' },
            { text: 'ดูที่มุมขวาบนจะมีรูป Avatar YouTube ของคุณ กดที่รูปนั้น แล้วกด "Settings"' },
            { text: 'กดที่ "View advanced settings"' },
            { text: 'Copy Channel ID มาใส่ในช่อง Channel ID (Optional) ด้านล่าง' },
            { text: 'กดปุ่มเชื่อมต่อ จะมีหน้าต่างเด้งขึ้นมาให้กด Advanced → Go to aicontents.vip (unsafe) → Select all → Continue (รอให้ระบบดึงข้อมูลเสร็จ) การเชื่อมต่อช่องของคุณก็จะสำเร็จ' }
        ]
    },
    facebook: {
        name: 'Facebook',
        icon: Facebook,
        color: 'orange',
        bgGradient: 'from-orange-600 to-blue-800',
        description: 'เชื่อมต่อ Facebook Page เพื่อดึงข้อมูล Followers และโพสต์อัตโนมัติ',
        consoleUrl: 'https://developers.facebook.com/apps/create/',
        docsUrl: 'https://developers.facebook.com/docs/facebook-login/',
        steps: [
            'กดปุ่ม "Developer Console" จะเปิดหน้าสร้าง App ใหม่ (ต้อง Login Facebook ก่อน)',
            'กรอก App name, Email → Use case เลือก "Other" → กด Next จนจบ → กด "Create app"',
            'ที่ Dashboard ไปที่ App settings → Basic → Copy "App ID" และกด Show เพื่อ Copy "App secret"',
            'ไปที่ Use cases → กด Customize → Facebook Login → Settings → ใส่ Redirect URI ด้านล่างนี้',
            'Copy URL ด้านล่างไปใส่ช่อง "Valid OAuth Redirect URIs" → กด Save changes',
            'กลับมาที่หน้านี้ กรอก App ID และ App Secret → กดบันทึกการตั้งค่า → กดเชื่อมต่อ'
        ],
        fields: [
            { id: 'appId', label: 'App ID', placeholder: '1234567890', type: 'text' },
            { id: 'appSecret', label: 'App Secret', placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' },
            { id: 'pageId', label: 'Page ID (Optional)', placeholder: '1234567890', type: 'text', hasHelp: true }
        ],
        pageIdHelp: [
            { text: 'กดลิงก์นี้เพื่อไปหน้า Facebook Pages ของคุณ', link: 'https://www.facebook.com/pages/?category=your_pages' },
            { text: 'เลือก Page ที่ต้องการ → กดที่ About → Page transparency' },
            { text: 'Copy Page ID มาใส่ในช่อง Page ID (Optional) ด้านล่าง' },
            { text: 'กดปุ่มเชื่อมต่อ จะมีหน้าต่างเด้งขึ้นมาให้กด Continue with Facebook → เลือก Page ที่ต้องการ → Continue (รอให้ระบบดึงข้อมูลเสร็จ) การเชื่อมต่อ Page ของคุณก็จะสำเร็จ' }
        ]
    },
    instagram: {
        name: 'Instagram',
        icon: Instagram,
        color: 'orange',
        bgGradient: 'from-orange-600 to-pink-800',
        description: 'เชื่อมต่อ Instagram Business Account (ต้องเชื่อมกับ Facebook Page)',
        consoleUrl: 'https://developers.facebook.com/apps/',
        docsUrl: 'https://developers.facebook.com/docs/instagram-api/',
        steps: [
            'ต้องมี Facebook Page ที่เชื่อมกับ Instagram Business Account',
            'กดปุ่ม "Developer Console" ไปที่ Meta Developer Portal',
            'เพิ่ม Instagram Graph API ใน App ที่สร้างไว้',
            'เพิ่ม Redirect URI และคัดลอก App ID, App Secret',
            'กดปุ่ม "บันทึกการตั้งค่า" และ "เชื่อมต่อ"'
        ],
        fields: [
            { id: 'appId', label: 'Facebook App ID', placeholder: '1234567890', type: 'text' },
            { id: 'appSecret', label: 'Facebook App Secret', placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' },
            { id: 'igUserId', label: 'Instagram User ID (Optional)', placeholder: '17841400000000', type: 'text', hasHelp: true }
        ],
        igUserIdHelp: [
            { text: 'Instagram ต้องเป็น Business Account และเชื่อมกับ Facebook Page ก่อน' },
            { text: 'ไปที่ Instagram App → Settings → Account → Switch to Professional Account' },
            { text: 'เลือก Business และเชื่อมต่อ Facebook Page ที่สร้างไว้' },
            { text: 'Instagram User ID จะถูกดึงอัตโนมัติหลังเชื่อมต่อสำเร็จ (ไม่ต้องกรอก)' },
            { text: 'กดปุ่มเชื่อมต่อ จะมีหน้าต่างเด้งขึ้นมาให้กด Continue with Facebook → เลือก Page/IG → Continue (รอให้ระบบดึงข้อมูลเสร็จ)' }
        ]
    },
    tiktok: {
        name: 'TikTok',
        icon: Video,
        color: 'orange',
        bgGradient: 'from-orange-600 to-cyan-800',
        description: 'เชื่อมต่อ TikTok Account สำหรับอัพโหลดวิดีโอ (ต้อง Apply เป็น Developer)',
        consoleUrl: 'https://developers.tiktok.com/',
        docsUrl: 'https://developers.tiktok.com/doc/login-kit-web/',
        steps: [
            'กดปุ่ม "Developer Console" ไปที่ TikTok Developer Portal',
            'Apply เป็น Developer และรอ Approval (1-3 วัน)',
            'สร้าง App ใหม่และตั้งค่า Login Kit',
            'เพิ่ม Redirect URI และคัดลอก Client Key, Client Secret',
            'กดปุ่ม "บันทึกการตั้งค่า" และ "เชื่อมต่อ"'
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
    const [testing, setTesting] = useState(false);
    const [formData, setFormData] = useState({});
    const [toast, setToast] = useState({ message: '', type: '', visible: false });
    const [showHelpDropdown, setShowHelpDropdown] = useState(null); // field id
    const [confirmSave, setConfirmSave] = useState(false);
    
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

    const handleSaveClick = () => {
        setConfirmSave(true);
    };

    const handleConfirmSave = async () => {
        if (!currentUser || !accountId) return;
        
        setSaving(true);
        setConfirmSave(false);
        try {
            const accountRef = doc(db, 'users', currentUser.uid, 'accounts', accountId);
            await updateDoc(accountRef, {
                ...formData,
                setupComplete: true,
                updatedAt: new Date()
            });
            showToast(`ระบบได้บันทึกข้อมูลบัญชี "${account?.name || config.name}" เรียบร้อยแล้ว`, 'success');
            // Navigate to Platforms page after short delay
            setTimeout(() => {
                navigate('/platforms');
            }, 1500);
        } catch (error) {
            console.error('Error saving:', error);
            showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!currentUser || !accountId) return;
        
        // Validate credentials first
        if (platform === 'youtube') {
            if (!formData.clientId || !formData.clientSecret) {
                showToast('กรุณากรอก Client ID และ Client Secret ก่อน', 'error');
                return;
            }
        }

        setTesting(true);
        try {
            // Save credentials first
            const accountRef = doc(db, 'users', currentUser.uid, 'accounts', accountId);
            await updateDoc(accountRef, {
                ...formData,
                setupComplete: true,
                updatedAt: new Date()
            });

            // Start OAuth flow
            const functions = getFunctions();
            const youtubeAuthStart = httpsCallable(functions, 'youtubeAuthStart');
            
            const redirectUri = `${window.location.origin}/oauth/callback`;
            
            const result = await youtubeAuthStart({
                accountId,
                clientId: formData.clientId,
                redirectUri
            });

            if (result.data.authUrl) {
                // Redirect to Google OAuth
                window.location.href = result.data.authUrl;
            } else {
                throw new Error('Failed to get auth URL');
            }

        } catch (error) {
            console.error('OAuth start error:', error);
            showToast(error.message || 'เกิดข้อผิดพลาดในการเริ่ม OAuth', 'error');
            setTesting(false);
        }
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
                                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                        {idx + 1}
                                    </span>
                                    <div className="text-slate-300 text-sm">
                                        {step}
                                        {/* Show Redirect URI in step 5 (idx=4) */}
                                        {idx === 4 && (
                                            <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg p-2">
                                                <code className="text-green-400 text-xs flex-1 break-all">
                                                    {window.location.origin}/oauth/callback
                                                </code>
                                                <button 
                                                    onClick={() => copyToClipboard(`${window.location.origin}/oauth/callback`)}
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

                        {/* 3 Buttons in one row - Orange theme */}
                        <div className="flex gap-2 mt-6 pt-4 border-t border-white/10">
                            {config.enableApiUrl && (
                                <a 
                                    href={config.enableApiUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 py-3 flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all text-xs"
                                >
                                    <Shield size={14} />
                                    <span>Enable API</span>
                                </a>
                            )}
                            <a 
                                href={config.consoleUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 py-3 flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition-all text-xs"
                            >
                                <ExternalLink size={14} />
                                <span>Developer Console</span>
                            </a>
                            <a 
                                href={config.docsUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 py-3 flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold rounded-xl transition-all text-xs"
                            >
                                <ExternalLink size={14} />
                                <span>Docs</span>
                            </a>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Key size={20} className="text-orange-400" />
                            API Credentials
                        </h2>

                        <div className="space-y-4">
                            {config.fields.map(field => (
                                <div key={field.id} className="relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm text-slate-400">{field.label}</label>
                                        {/* Help button for optional fields */}
                                        {field.hasHelp && (
                                            <button
                                                onClick={() => setShowHelpDropdown(showHelpDropdown === field.id ? null : field.id)}
                                                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                                            >
                                                <HelpCircle size={14} />
                                                <span>คำอธิบายเพิ่มเติม</span>
                                                {showHelpDropdown === field.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Help Dropdown */}
                                    {field.hasHelp && showHelpDropdown === field.id && (
                                        <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm">
                                            <p className="text-orange-300 font-semibold mb-2">วิธีหา {field.label}:</p>
                                            <ol className="space-y-2">
                                                {(config[`${field.id}Help`] || config.channelIdHelp || []).map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-slate-300">
                                                        <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            {i + 1}
                                                        </span>
                                                        {item.link ? (
                                                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                                                                {item.text} →
                                                            </a>
                                                        ) : (
                                                            <span>{item.text}</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                    
                                    <input
                                        type={field.type}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                        placeholder={field.placeholder}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Buttons - Orange theme */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveClick}
                                disabled={saving}
                                className="flex-1 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                บันทึกการตั้งค่า
                            </button>
                            <button
                                onClick={handleTestConnection}
                                disabled={testing}
                                className="flex-1 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {testing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                {testing ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Confirmation Popup */}
                {confirmSave && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} className="text-orange-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">ยืนยันการบันทึก?</h3>
                                <p className="text-slate-400 mb-6">
                                    คุณต้องการบันทึกการตั้งค่าสำหรับบัญชี "{account?.name || config.name}" หรือไม่?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmSave(false)}
                                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleConfirmSave}
                                        disabled={saving}
                                        className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                        ยืนยัน
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
