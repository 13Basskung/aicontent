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
                // Decode state to get accountId
                const stateData = JSON.parse(atob(state));
                const accountId = stateData.accountId;

                // Get account credentials from Firestore
                const accountRef = doc(db, 'users', user.uid, 'accounts', accountId);
                const accountDoc = await getDoc(accountRef);

                if (!accountDoc.exists()) {
                    throw new Error('Account not found');
                }

                const account = accountDoc.data();

                // Call Cloud Function to exchange code for token
                const functions = getFunctions();
                const youtubeAuthCallback = httpsCallable(functions, 'youtubeAuthCallback');

                setMessage('กำลังแลกเปลี่ยน Token...');

                const result = await youtubeAuthCallback({
                    code,
                    state,
                    clientId: account.clientId,
                    clientSecret: account.clientSecret,
                    redirectUri: `${window.location.origin}/oauth/callback`
                });

                if (result.data.success) {
                    setStatus('success');
                    setMessage('เชื่อมต่อสำเร็จ!');
                    setChannelInfo({
                        name: result.data.channelName,
                        channelId: result.data.channelId,
                        subscribers: result.data.subscribers
                    });

                    // Redirect to platforms page after 3 seconds
                    setTimeout(() => {
                        navigate('/platforms');
                    }, 3000);
                } else {
                    throw new Error('Failed to connect');
                }

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
