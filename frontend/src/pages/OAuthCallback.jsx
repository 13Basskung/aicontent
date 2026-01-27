import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('กำลังเชื่อมต่อบัญชี...');
    const [channelInfo, setChannelInfo] = useState(null);

    useEffect(() => {
        const processCallback = async (user) => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const error = searchParams.get('error');

            // Handle OAuth error
            if (error) {
                setStatus('error');
                setMessage(`OAuth Error: ${error}`);
                return;
            }

            if (!code || !state) {
                setStatus('error');
                setMessage('Missing authorization code or state');
                return;
            }

            try {
                // Decode state - it's URL encoded JSON string
                const stateData = JSON.parse(decodeURIComponent(state));
                const { platform, userId, accountId } = stateData;

                // Call appropriate Cloud Function based on platform
                const functions = getFunctions();
                const redirectUri = `${window.location.origin}/oauth/callback`;

                setMessage('กำลังแลกเปลี่ยน Token...');

                let result;

                if (platform === 'youtube') {
                    const youtubeAuthCallback = httpsCallable(functions, 'youtubeAuthCallback');
                    result = await youtubeAuthCallback({
                        code,
                        redirectUri
                    });

                    if (result.data.success) {
                        setStatus('success');
                        setMessage('เชื่อมต่อ YouTube สำเร็จ!');
                        setChannelInfo({
                            name: result.data.channelName,
                            channelId: result.data.channelId,
                            subscribers: result.data.subscribers
                        });
                    } else {
                        throw new Error(result.data.error || 'Failed to connect YouTube');
                    }
                } else if (platform === 'facebook' || platform === 'instagram') {
                    const facebookAuthCallback = httpsCallable(functions, 'facebookAuthCallback');
                    result = await facebookAuthCallback({
                        code,
                        redirectUri,
                        platform
                    });

                    if (result.data.success) {
                        setStatus('success');
                        setMessage(`เชื่อมต่อ ${platform === 'facebook' ? 'Facebook' : 'Instagram'} สำเร็จ!`);
                        setChannelInfo({
                            name: result.data.pageName || result.data.accountName,
                            pageId: result.data.pageId
                        });
                    } else {
                        throw new Error(result.data.error || `Failed to connect ${platform}`);
                    }
                } else if (platform === 'tiktok') {
                    const tiktokAuthCallback = httpsCallable(functions, 'tiktokAuthCallback');
                    result = await tiktokAuthCallback({
                        code,
                        redirectUri
                    });

                    if (result.data.success) {
                        setStatus('success');
                        setMessage('เชื่อมต่อ TikTok สำเร็จ!');
                        setChannelInfo({
                            name: result.data.username
                        });
                    } else {
                        throw new Error(result.data.error || 'Failed to connect TikTok');
                    }
                } else {
                    throw new Error('Unknown platform: ' + platform);
                }

                // Redirect to platforms page after 3 seconds
                setTimeout(() => {
                    navigate('/platforms');
                }, 3000);

            } catch (err) {
                console.error('OAuth callback error:', err);
                setStatus('error');
                setMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                processCallback(user);
            } else {
                setStatus('error');
                setMessage('กรุณาเข้าสู่ระบบก่อน');
            }
        });

        return () => unsubscribe();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
                {status === 'processing' && (
                    <>
                        <Loader2 size={64} className="animate-spin text-blue-400 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-white mb-2">กำลังดำเนินการ</h1>
                        <p className="text-slate-400">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={48} className="text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">{message}</h1>
                        {channelInfo && (
                            <div className="bg-black/30 rounded-xl p-4 mt-4 text-left">
                                <p className="text-slate-400 text-sm">Channel Name</p>
                                <p className="text-white font-bold text-lg">{channelInfo.name}</p>
                                {channelInfo.subscribers && (
                                    <>
                                        <p className="text-slate-400 text-sm mt-2">Subscribers</p>
                                        <p className="text-white font-bold">{parseInt(channelInfo.subscribers).toLocaleString()}</p>
                                    </>
                                )}
                            </div>
                        )}
                        <p className="text-slate-500 text-sm mt-4">กำลังนำคุณกลับไปหน้า Platforms...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle size={48} className="text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">เกิดข้อผิดพลาด</h1>
                        <p className="text-red-400 mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/platforms')}
                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
                        >
                            กลับหน้า Platforms
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
