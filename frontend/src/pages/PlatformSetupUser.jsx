import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    ArrowLeft, Youtube, Facebook, Instagram, Video, CheckCircle, AlertCircle, 
    Loader2, RefreshCw, HelpCircle, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Platform Configuration (User View - No API Credentials)
const PLATFORM_CONFIG = {
    youtube: {
        name: 'YouTube',
        icon: Youtube,
        color: 'red',
        bgGradient: 'from-red-600 to-red-800',
        description: 'เชื่อมต่อ YouTube Channel เพื่อดึงข้อมูล Subscribers, Views และอัพโหลดวิดีโอ',
        docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
        instructions: [
            'กดปุ่ม "เชื่อมต่อ YouTube" ด้านล่าง',
            'เลือกบัญชี Google ที่ต้องการเชื่อมต่อ',
            'กด "Advanced" → "Go to aicontents.vip (unsafe)"',
            'กด "Select all" → "Continue"',
            'รอให้ระบบดึงข้อมูล Channel → เสร็จสิ้น!'
        ]
    },
    facebook: {
        name: 'Facebook',
        icon: Facebook,
        color: 'blue',
        bgGradient: 'from-orange-600 to-blue-800',
        description: 'เชื่อมต่อ Facebook Page เพื่อดึงข้อมูล Followers และโพสต์อัตโนมัติ',
        docsUrl: 'https://developers.facebook.com/docs/facebook-login/',
        instructions: [
            'กดปุ่ม "เชื่อมต่อ Facebook" ด้านล่าง',
            'Login Facebook (ถ้ายังไม่ได้ Login)',
            'เลือก Page ที่ต้องการเชื่อมต่อ',
            'กด "Continue" → รอให้ระบบดึงข้อมูล',
            'เสร็จสิ้น!'
        ]
    },
    instagram: {
        name: 'Instagram',
        icon: Instagram,
        color: 'pink',
        bgGradient: 'from-orange-600 to-pink-800',
        description: 'เชื่อมต่อ Instagram Business Account (ต้องเชื่อมกับ Facebook Page)',
        docsUrl: 'https://developers.facebook.com/docs/instagram-api/',
        instructions: [
            '⚠️ Instagram ต้องเป็น Business Account และเชื่อมกับ Facebook Page ก่อน',
            'ไปที่ Instagram App → Settings → Switch to Professional Account',
            'เลือก Business และเชื่อมต่อ Facebook Page',
            'กลับมากดปุ่ม "เชื่อมต่อ Instagram"',
            'Login Facebook → เลือก Page/Instagram → Continue',
            'เสร็จสิ้น!'
        ]
    },
    tiktok: {
        name: 'TikTok',
        icon: Video,
        color: 'cyan',
        bgGradient: 'from-cyan-600 to-pink-800',
        description: 'เชื่อมต่อ TikTok Account สำหรับอัพโหลดวิดีโอ',
        docsUrl: 'https://developers.tiktok.com/doc/login-kit-web',
        instructions: [
            'กดปุ่ม "เชื่อมต่อ TikTok" ด้านล่าง',
            'Login TikTok (ถ้ายังไม่ได้ Login)',
            'อนุญาตให้ aicontents.vip เข้าถึงบัญชี',
            'รอให้ระบบดึงข้อมูล',
            'เสร็จสิ้น!'
        ],
        warning: '⚠️ TikTok API ยังอยู่ในช่วง Beta - บางฟีเจอร์อาจยังไม่พร้อมใช้งาน'
    }
};

export default function PlatformSetupUser() {
    const { platform, accountId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [accountData, setAccountData] = useState(null);
    const [showInstructions, setShowInstructions] = useState(true);

    const config = PLATFORM_CONFIG[platform];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser && accountId !== 'new') {
                loadAccountData(currentUser.uid);
            }
        });
        return () => unsubscribe();
    }, [accountId]);

    const loadAccountData = async (userId) => {
        try {
            const accountRef = doc(db, 'users', userId, 'platforms', platform, 'accounts', accountId);
            const accountSnap = await getDoc(accountRef);
            
            if (accountSnap.exists()) {
                setAccountData(accountSnap.data());
            }
        } catch (error) {
            console.error('Error loading account:', error);
        }
    };

    const handleConnect = async () => {
        if (!user) {
            alert('กรุณา Login ก่อนเชื่อมต่อ');
            return;
        }

        setLoading(true);

        try {
            // Redirect to OAuth
            const redirectUri = `${window.location.origin}/oauth/callback`;
            const state = JSON.stringify({
                platform,
                userId: user.uid,
                accountId: accountId === 'new' ? null : accountId
            });

            let authUrl = '';

            switch (platform) {
                case 'youtube':
                    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                        `client_id=YOUR_CLIENT_ID&` +
                        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                        `response_type=code&` +
                        `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload')}&` +
                        `access_type=offline&` +
                        `prompt=consent&` +
                        `state=${encodeURIComponent(state)}`;
                    break;

                case 'facebook':
                    authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
                        `client_id=YOUR_APP_ID&` +
                        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                        `scope=${encodeURIComponent('pages_show_list,pages_read_engagement,pages_manage_posts')}&` +
                        `state=${encodeURIComponent(state)}`;
                    break;

                case 'instagram':
                    authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
                        `client_id=YOUR_APP_ID&` +
                        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                        `scope=${encodeURIComponent('instagram_basic,instagram_content_publish,pages_show_list')}&` +
                        `state=${encodeURIComponent(state)}`;
                    break;

                case 'tiktok':
                    authUrl = `https://www.tiktok.com/auth/authorize/?` +
                        `client_key=YOUR_CLIENT_KEY&` +
                        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                        `response_type=code&` +
                        `scope=user.info.basic,video.list,video.upload&` +
                        `state=${encodeURIComponent(state)}`;
                    break;
            }

            window.location.href = authUrl;

        } catch (error) {
            console.error('Connection error:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('ต้องการยกเลิกการเชื่อมต่อหรือไม่?')) return;

        try {
            const accountRef = doc(db, 'users', user.uid, 'platforms', platform, 'accounts', accountId);
            await updateDoc(accountRef, {
                connected: false,
                disconnectedAt: new Date().toISOString()
            });

            alert('ยกเลิกการเชื่อมต่อเรียบร้อย');
            navigate('/platforms');
        } catch (error) {
            console.error('Disconnect error:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    };

    if (!config) {
        return (
            <div className="p-8">
                <div className="text-center text-white">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                    <h2 className="text-2xl font-bold mb-2">Platform not found</h2>
                    <Link to="/platforms" className="text-orange-400 hover:underline">
                        กลับไปหน้า Platforms
                    </Link>
                </div>
            </div>
        );
    }

    const Icon = config.icon;

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <Link 
                    to="/platforms"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
                >
                    <ArrowLeft size={20} />
                    <span>กลับไปหน้า Platforms</span>
                </Link>

                {/* Platform Header */}
                <div className={`bg-gradient-to-r ${config.bgGradient} rounded-2xl p-6 mb-6 shadow-xl`}>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Icon size={32} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-1">
                                เชื่อมต่อ {config.name}
                            </h1>
                            <p className="text-white/80">{config.description}</p>
                        </div>
                    </div>
                </div>

                {/* Warning for TikTok */}
                {config.warning && (
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
                        <p className="text-yellow-300 text-sm">{config.warning}</p>
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left: Instructions */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <button
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="w-full flex items-center justify-between text-xl font-bold text-white mb-4"
                        >
                            <span>วิธีการเชื่อมต่อ</span>
                            {showInstructions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        
                        {showInstructions && (
                            <ol className="space-y-3">
                                {config.instructions.map((instruction, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <span className={`w-6 h-6 rounded-full bg-${config.color}-500/20 text-${config.color}-400 flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                                            {idx + 1}
                                        </span>
                                        <span className="text-slate-300 text-sm">{instruction}</span>
                                    </li>
                                ))}
                            </ol>
                        )}

                        {config.docsUrl && (
                            <a
                                href={config.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <ExternalLink size={16} />
                                <span>ดูเอกสารเพิ่มเติม</span>
                            </a>
                        )}
                    </div>

                    {/* Right: Connect Button */}
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">การเชื่อมต่อ</h2>

                        {accountData?.connected ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400">
                                    <CheckCircle size={18} />
                                    <span className="text-sm">เชื่อมต่อแล้ว</span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Account:</span>
                                        <span className="text-white font-semibold">{accountData.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">เชื่อมต่อเมื่อ:</span>
                                        <span className="text-white">{new Date(accountData.connectedAt).toLocaleDateString('th-TH')}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleConnect}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-all text-blue-400 hover:text-blue-300"
                                    >
                                        <RefreshCw size={18} />
                                        <span>เชื่อมต่อใหม่</span>
                                    </button>
                                    <button
                                        onClick={handleDisconnect}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl transition-all text-red-400 hover:text-red-300"
                                    >
                                        <AlertCircle size={18} />
                                        <span>ยกเลิกการเชื่อมต่อ</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleConnect}
                                disabled={loading}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all ${
                                    loading
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : `bg-gradient-to-r ${config.bgGradient} text-white hover:opacity-90 shadow-lg`
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>กำลังเชื่อมต่อ...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon size={20} />
                                        <span>เชื่อมต่อ {config.name}</span>
                                    </>
                                )}
                            </button>
                        )}

                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <div className="flex items-start gap-2">
                                <HelpCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-blue-300">
                                    การเชื่อมต่อจะใช้ App ที่ Admin ตั้งค่าไว้แล้ว คุณไม่ต้องสร้าง App เอง
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
