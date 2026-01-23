import React, { useEffect, useMemo, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, Clock, XCircle, Wallet, ArrowUpRight, ArrowDownRight, Building2, Plus, Trash2, CreditCard, Crown, Star, Zap, Calendar, AlertTriangle, Sparkles } from 'lucide-react';
import generatePayload from 'promptpay-qr';
import { QRCodeSVG } from 'qrcode.react';
import GlassDropdown from '../components/ui/GlassDropdown';
import { auth, db, storage } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import useSubscription from '../hooks/useSubscription';
import {
    SUBSCRIPTION_PRICES,
    calculateTotalPrice,
    calculateProrate,
    formatPrice,
    formatThaiDate,
    getExpiryDate,
    SUBSCRIPTION_TIERS,
} from '../utils/subscriptionUtils';

const PROMPTPAY_NUMBER = '0986967282';
const PROMPTPAY_MASKED = '098-***-7282';

// PromptPay QR Component - สร้าง QR Code ที่มียอดเงินฝังอยู่จริง
const PromptPayQR = ({ amount, size = 224, className = '' }) => {
    const payload = useMemo(() => {
        // สร้าง PromptPay payload string พร้อมยอดเงิน
        return generatePayload(PROMPTPAY_NUMBER, { amount: amount || undefined });
    }, [amount]);

    return (
        <div className={`bg-white p-3 rounded-xl ${className}`}>
            <QRCodeSVG 
                value={payload} 
                size={size} 
                level="M"
                includeMargin={false}
            />
        </div>
    );
};

const THAI_BANKS = [
    { code: 'kbank', name: 'ธนาคารกสิกรไทย', color: '#138f2d' },
    { code: 'scb', name: 'ธนาคารไทยพาณิชย์', color: '#4e2a84' },
    { code: 'ktb', name: 'ธนาคารกรุงไทย', color: '#1ba5e0' },
    { code: 'bbl', name: 'ธนาคารกรุงเทพ', color: '#1e4598' },
    { code: 'bay', name: 'ธนาคารกรุงศรีอยุธยา', color: '#fec43b' },
    { code: 'tmb', name: 'ธนาคารทหารไทยธนชาต (TTB)', color: '#1279be' },
    { code: 'gsb', name: 'ธนาคารออมสิน', color: '#eb198d' },
    { code: 'promptpay', name: 'PromptPay', color: '#1c4b9c' },
];

const Payments = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [mainTab, setMainTab] = useState('credit'); // 'credit' | 'subscription'
    const [activeTab, setActiveTab] = useState('deposit');
    
    // Wallet
    const [walletBalance, setWalletBalance] = useState(0);
    const [loadingWallet, setLoadingWallet] = useState(false);

    // Deposit
    const [amount, setAmount] = useState('');
    const [slipFile, setSlipFile] = useState(null);
    const [slipPreview, setSlipPreview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    // Withdrawal
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
    const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

    // Bank Accounts
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [selectedBankId, setSelectedBankId] = useState('');
    const [showAddBankModal, setShowAddBankModal] = useState(false);
    const [newBank, setNewBank] = useState({ bankCode: '', accountNumber: '', accountName: '' });
    const [savingBank, setSavingBank] = useState(false);

    // Subscription States
    const [extraProjects, setExtraProjects] = useState(0);
    const [subSlipFile, setSubSlipFile] = useState(null);
    const [subSlipPreview, setSubSlipPreview] = useState('');
    const [submittingSub, setSubmittingSub] = useState(false);
    const [subscriptionPayments, setSubscriptionPayments] = useState([]);
    const [loadingSubPayments, setLoadingSubPayments] = useState(false);
    
    // Use Subscription Hook
    const { subscription, loading: loadingSub, getStatus } = useSubscription(currentUser?.uid);
    const subStatus = getStatus();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Wallet Balance
    useEffect(() => {
        if (!currentUser) return;
        setLoadingWallet(true);
        const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid, 'wallet', 'main'), (snap) => {
            setWalletBalance(snap.exists() ? (snap.data().balance || 0) : 0);
            setLoadingWallet(false);
        }, () => setLoadingWallet(false));
        return () => unsubscribe();
    }, [currentUser]);

    // Fetch Bank Accounts
    useEffect(() => {
        if (!currentUser) return;
        setLoadingBanks(true);
        const q = query(collection(db, 'users', currentUser.uid, 'bank_accounts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setBankAccounts(data);
            if (data.length > 0 && !selectedBankId) setSelectedBankId(data[0].id);
            setLoadingBanks(false);
        }, () => setLoadingBanks(false));
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        if (!slipFile) {
            setSlipPreview('');
            return;
        }
        const objectUrl = URL.createObjectURL(slipFile);
        setSlipPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [slipFile]);

    // Fetch Payment Requests
    useEffect(() => {
        if (!currentUser) {
            setPaymentRequests([]);
            return undefined;
        }
        setLoadingRequests(true);
        const q = query(
            collection(db, 'payment_requests'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setPaymentRequests(data);
            setLoadingRequests(false);
        }, () => setLoadingRequests(false));
        return () => unsubscribe();
    }, [currentUser]);

    // Fetch Withdrawal Requests
    useEffect(() => {
        if (!currentUser) {
            setWithdrawalRequests([]);
            return undefined;
        }
        setLoadingWithdrawals(true);
        const q = query(
            collection(db, 'withdrawal_requests'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setWithdrawalRequests(data);
            setLoadingWithdrawals(false);
        }, () => setLoadingWithdrawals(false));
        return () => unsubscribe();
    }, [currentUser]);

    // Subscription Slip Preview
    useEffect(() => {
        if (!subSlipFile) {
            setSubSlipPreview('');
            return;
        }
        const objectUrl = URL.createObjectURL(subSlipFile);
        setSubSlipPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [subSlipFile]);

    // Fetch Subscription Payments
    useEffect(() => {
        if (!currentUser) {
            setSubscriptionPayments([]);
            return undefined;
        }
        setLoadingSubPayments(true);
        const q = query(
            collection(db, 'subscription_payments'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setSubscriptionPayments(data);
            setLoadingSubPayments(false);
        }, () => setLoadingSubPayments(false));
        return () => unsubscribe();
    }, [currentUser]);

    // Calculate subscription price
    const subscriptionPriceInfo = useMemo(() => {
        const now = new Date();
        const dayOfMonth = now.getDate();
        const isProrate = dayOfMonth > 1; // ถ้าไม่ใช่วันที่ 1 = prorate
        return calculateTotalPrice(extraProjects, isProrate, now);
    }, [extraProjects]);

    const statusMeta = useMemo(() => ({
        pending: {
            label: 'Pending',
            className: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
            icon: Clock
        },
        approved: {
            label: 'Approved',
            className: 'bg-green-500/20 text-green-300 border-green-400/30',
            icon: CheckCircle
        },
        rejected: {
            label: 'Rejected',
            className: 'bg-red-500/20 text-red-300 border-red-400/30',
            icon: XCircle
        }
    }), []);

    const handleSubmit = async () => {
        if (!currentUser) {
            alert('กรุณาเข้าสู่ระบบก่อน');
            return;
        }

        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
            alert('กรุณากรอกจำนวนเงินที่ถูกต้อง');
            return;
        }
        if (!slipFile) {
            alert('กรุณาแนบสลิปการโอนเงิน');
            return;
        }

        setSubmitting(true);
        try {
            const safeName = slipFile.name.replace(/\s+/g, '_');
            const filePath = `users/${currentUser.uid}/payment_slips/${Date.now()}_${safeName}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, slipFile);
            const slipUrl = await getDownloadURL(storageRef);

            await addDoc(collection(db, 'payment_requests'), {
                userId: currentUser.uid,
                userEmail: currentUser.email || '',
                amount: numericAmount,
                slipUrl,
                slipPath: filePath,
                status: 'pending',
                method: 'promptpay',
                promptpayMasked: PROMPTPAY_MASKED,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            setAmount('');
            setSlipFile(null);
            alert('✅ แจ้งชำระเงินเรียบร้อยแล้ว รอการตรวจสอบจากแอดมิน');
        } catch (error) {
            console.error('Payment request failed:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Add Bank Account
    const handleAddBank = async () => {
        if (!currentUser) return;
        if (!newBank.bankCode || !newBank.accountNumber || !newBank.accountName) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        if (newBank.accountNumber.length < 10) {
            alert('เลขบัญชีต้องมีอย่างน้อย 10 หลัก');
            return;
        }

        setSavingBank(true);
        try {
            const bankInfo = THAI_BANKS.find(b => b.code === newBank.bankCode);
            await addDoc(collection(db, 'users', currentUser.uid, 'bank_accounts'), {
                bankCode: newBank.bankCode,
                bankName: bankInfo?.name || newBank.bankCode,
                accountNumber: newBank.accountNumber,
                accountName: newBank.accountName,
                createdAt: serverTimestamp()
            });
            setNewBank({ bankCode: '', accountNumber: '', accountName: '' });
            setShowAddBankModal(false);
            alert('✅ เพิ่มบัญชีเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Add bank failed:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSavingBank(false);
        }
    };

    // Delete Bank Account
    const handleDeleteBank = async (bankId) => {
        if (!confirm('ยืนยันลบบัญชีนี้?')) return;
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'bank_accounts', bankId));
            if (selectedBankId === bankId) setSelectedBankId('');
        } catch (error) {
            console.error('Delete bank failed:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    };

    // Submit Withdrawal
    const handleWithdraw = async () => {
        if (!currentUser) {
            alert('กรุณาเข้าสู่ระบบก่อน');
            return;
        }
        const numericAmount = Number(withdrawAmount);
        if (!numericAmount || numericAmount <= 0) {
            alert('กรุณากรอกจำนวนเงินที่ถูกต้อง');
            return;
        }
        if (numericAmount > walletBalance) {
            alert(`ยอดเครดิตไม่เพียงพอ (คงเหลือ ${walletBalance} TOKEN)`);
            return;
        }
        if (!selectedBankId) {
            alert('กรุณาเลือกบัญชีปลายทาง');
            return;
        }

        const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
        if (!selectedBank) {
            alert('ไม่พบบัญชีที่เลือก');
            return;
        }

        if (!confirm(`ยืนยันขอถอน ${numericAmount} TOKEN ไปยัง\n${selectedBank.bankName}\n${selectedBank.accountNumber}\n${selectedBank.accountName}?`)) return;

        setSubmittingWithdrawal(true);
        try {
            await addDoc(collection(db, 'withdrawal_requests'), {
                userId: currentUser.uid,
                userEmail: currentUser.email || '',
                amount: numericAmount,
                bankId: selectedBankId,
                bankCode: selectedBank.bankCode,
                bankName: selectedBank.bankName,
                accountNumber: selectedBank.accountNumber,
                accountName: selectedBank.accountName,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setWithdrawAmount('');
            alert('✅ ส่งคำขอถอนเงินเรียบร้อยแล้ว รอการอนุมัติจากแอดมิน');
        } catch (error) {
            console.error('Withdrawal request failed:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSubmittingWithdrawal(false);
        }
    };

    // Submit Subscription Payment
    const handleSubscriptionPayment = async () => {
        if (!currentUser) {
            alert('กรุณาเข้าสู่ระบบก่อน');
            return;
        }
        if (!subSlipFile) {
            alert('กรุณาแนบสลิปการโอนเงิน');
            return;
        }

        const priceInfo = subscriptionPriceInfo;
        const confirmMsg = `ยืนยันชำระค่า Subscription\n\n` +
            `แพลน Pro: ${formatPrice(priceInfo.breakdown.proPlan)}\n` +
            (extraProjects > 0 ? `เพิ่ม ${extraProjects} Project: ${formatPrice(priceInfo.breakdown.extraProjects)}\n` : '') +
            `\nรวมทั้งสิ้น: ${formatPrice(priceInfo.total)}\n` +
            `\nLimits ที่จะได้รับ:\n` +
            `- Projects: ${priceInfo.limits.projects}\n` +
            `- Modes: ${priceInfo.limits.modes}\n` +
            `- Extenders: ${priceInfo.limits.extenders}`;

        if (!confirm(confirmMsg)) return;

        setSubmittingSub(true);
        try {
            const safeName = subSlipFile.name.replace(/\s+/g, '_');
            const filePath = `users/${currentUser.uid}/subscription_slips/${Date.now()}_${safeName}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, subSlipFile);
            const slipUrl = await getDownloadURL(storageRef);

            const now = new Date();
            const endOfMonth = getExpiryDate(now);

            await addDoc(collection(db, 'subscription_payments'), {
                userId: currentUser.uid,
                userEmail: currentUser.email || '',
                type: extraProjects > 0 ? 'subscription_with_projects' : 'subscription',
                amount: priceInfo.total,
                breakdown: priceInfo.breakdown,
                extraProjects: extraProjects,
                totalProjects: 1 + extraProjects,
                limits: priceInfo.limits,
                tier: priceInfo.tier,
                isProrate: priceInfo.prorate !== null,
                prorateInfo: priceInfo.prorate,
                billingPeriod: {
                    start: now,
                    end: endOfMonth,
                },
                slipUrl,
                slipPath: filePath,
                status: 'pending',
                method: 'promptpay',
                promptpayMasked: PROMPTPAY_MASKED,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setExtraProjects(0);
            setSubSlipFile(null);
            alert('✅ แจ้งชำระค่า Subscription เรียบร้อยแล้ว รอการตรวจสอบจากแอดมิน');
        } catch (error) {
            console.error('Subscription payment failed:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setSubmittingSub(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col p-8 gap-6 bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 text-white font-sans overflow-hidden relative">
            {/* Subtle Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent" />
            </div>

            {/* Header + Wallet - Unified Style */}
            <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-300">
                                <Wallet className="text-white" size={32} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-red-100 to-orange-200 tracking-tight">
                                กระเป๋าเงิน
                            </h1>
                            <p className="text-base text-slate-400 font-light flex items-center gap-2 mt-1">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                                จัดการเครดิตของคุณ - เติมเงินและถอนเงิน
                            </p>
                        </div>
                    </div>
                    <div className="group relative bg-gradient-to-br from-orange-600/20 to-red-900/20 backdrop-blur-xl rounded-2xl border border-orange-500/30 p-5 flex items-center gap-5 hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <Wallet className="text-white" size={28} />
                        </div>
                        <div>
                            <p className="text-orange-300 text-sm font-medium uppercase tracking-wider">เครดิตคงเหลือ</p>
                            <p className="text-3xl font-black text-white tracking-tight">
                                {loadingWallet ? <Loader2 size={24} className="animate-spin" /> : walletBalance.toLocaleString()}
                                <span className="text-base font-medium text-orange-300 ml-2">TOKEN</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tab Navigation - เติมเครดิต / Subscription */}
            <div className="relative z-10 flex flex-col gap-4">
                <div className="inline-flex gap-2 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
                    <button
                        onClick={() => setMainTab('credit')}
                        className={`group relative flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                            mainTab === 'credit' ? 'bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/40 scale-105' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <Wallet size={24} className={`transition-transform duration-300 ${mainTab === 'credit' ? 'animate-bounce' : 'group-hover:rotate-12'}`} /> เติมเครดิต
                        {mainTab === 'credit' && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />}
                    </button>
                    <button
                        onClick={() => setMainTab('subscription')}
                        className={`group relative flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                            mainTab === 'subscription' ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/40 scale-105' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        <Crown size={24} className={`transition-transform duration-300 ${mainTab === 'subscription' ? 'animate-bounce' : 'group-hover:rotate-12'}`} /> Subscription
                        {subStatus.isInTrial && <span className="ml-2 px-2 py-0.5 bg-yellow-500/30 text-yellow-300 text-xs rounded-full">ทดลองใช้</span>}
                        {mainTab === 'subscription' && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />}
                    </button>
                </div>

                {/* Sub Tab Navigation for Credit */}
                {mainTab === 'credit' && (
                    <div className="inline-flex gap-2 bg-black/30 backdrop-blur-xl p-1.5 rounded-xl border border-white/5">
                        <button
                            onClick={() => setActiveTab('deposit')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                                activeTab === 'deposit' ? 'bg-green-600/80 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <ArrowUpRight size={18} /> เติมเครดิต
                        </button>
                        <button
                            onClick={() => setActiveTab('withdraw')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                                activeTab === 'withdraw' ? 'bg-red-600/80 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <ArrowDownRight size={18} /> ถอนเงิน
                        </button>
                        <button
                            onClick={() => setActiveTab('banks')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                                activeTab === 'banks' ? 'bg-blue-600/80 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <Building2 size={18} /> บัญชีธนาคาร
                        </button>
                    </div>
                )}
            </div>

            {/* Deposit Tab */}
            {mainTab === 'credit' && activeTab === 'deposit' && (
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 relative bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
                        <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 rounded-full blur-3xl" />
                        
                        <div className="flex items-center gap-4 mb-6 relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 text-2xl">💳</div>
                            <div>
                                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400">PromptPay QR</h2>
                                <p className="text-sm text-slate-400">หมายเลข: {PROMPTPAY_MASKED}</p>
                            </div>
                        </div>

                        <div className="bg-black/40 rounded-2xl border border-green-500/20 p-5 flex flex-col items-center group hover:border-green-500/40 transition-all duration-300">
                            <PromptPayQR amount={Number(amount) || null} size={200} className="shadow-lg group-hover:scale-105 transition-transform duration-300 border-2 border-green-500/30" />
                            {amount && Number(amount) > 0 && (
                                <p className="text-lg font-bold text-green-400 mt-3">฿{Number(amount).toLocaleString()}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">สแกนด้วยแอปธนาคารเพื่อโอนเงิน</p>
                        </div>

                        <div className="mt-6 p-5 bg-gradient-to-br from-green-600/10 to-green-900/10 border border-green-500/20 rounded-2xl text-sm text-slate-300 leading-relaxed">
                            <p className="font-bold text-green-300 mb-3 flex items-center gap-2">📋 ขั้นตอน:</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>สแกน QR และโอนเงินตามยอดที่ต้องการ</li>
                                <li>แนบสลิป + กรอกจำนวนเงินให้ตรงกับยอดโอน</li>
                                <li>รอแอดมินตรวจสอบและเติมเครดิตให้</li>
                            </ol>
                        </div>
                    </div>

                    <div className="lg:col-span-3 relative bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500" />
                        
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg">
                                <ArrowUpRight className="text-white" size={22} />
                            </div>
                            แจ้งเติมเงิน
                        </h2>

                        <div className="grid grid-cols-1 gap-5">
                            <div>
                                <label className="text-sm text-green-300 mb-2 block font-medium">จำนวนเงินที่โอน (TOKEN)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                    placeholder="เช่น 500"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-green-300 mb-2 block font-medium">แนบสลิปการโอนเงิน</label>
                                <div className="flex flex-col gap-3">
                                    <label className="group flex items-center justify-center gap-3 px-6 py-5 rounded-xl border-2 border-dashed border-white/20 bg-black/30 cursor-pointer hover:border-green-400 hover:bg-green-500/5 transition-all duration-300">
                                        <Upload size={24} className="text-green-300 group-hover:animate-bounce" />
                                        <span className="text-sm text-slate-300 font-medium">คลิกเพื่ออัปโหลดสลิป</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} />
                                    </label>
                                    {slipPreview && (
                                        <div className="relative bg-black/40 rounded-2xl border border-green-500/20 p-4 group">
                                            <img src={slipPreview} alt="Slip preview" className="w-full max-h-48 object-contain rounded-xl group-hover:scale-105 transition-transform duration-300" />
                                        </div>
                                    )}
                                    {!slipPreview && <div className="flex items-center gap-2 text-xs text-slate-500"><ImageIcon size={14} /> ยังไม่มีสลิปที่แนบ</div>}
                                </div>
                            </div>

                            <button onClick={handleSubmit} disabled={submitting}
                                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-lg hover:scale-[1.02] ${
                                    submitting ? 'bg-slate-700 text-slate-300 cursor-wait' : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 shadow-lg shadow-green-500/30'
                                }`}>
                                {submitting ? <><Loader2 size={20} className="animate-spin" /> กำลังส่ง...</> : '✅ แจ้งเติมเงิน'}
                            </button>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-green-400" />
                                ประวัติการเติมเงิน
                            </h3>
                            {loadingRequests ? (
                                <div className="text-slate-400 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> กำลังโหลด...</div>
                            ) : paymentRequests.length === 0 ? (
                                <div className="text-slate-500 text-sm">ยังไม่มีรายการ</div>
                            ) : (
                                <div className="space-y-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                                    {paymentRequests.map((request) => {
                                        const meta = statusMeta[request.status] || statusMeta.pending;
                                        const StatusIcon = meta.icon;
                                        return (
                                            <div key={request.id} className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-white font-semibold">+{request.amount} TOKEN</p>
                                                    <p className="text-xs text-slate-500">{request.createdAt?.toDate ? request.createdAt.toDate().toLocaleString('th-TH') : 'รอเวลา'}</p>
                                                </div>
                                                <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${meta.className}`}>
                                                    <StatusIcon size={12} /> {meta.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Tab */}
            {mainTab === 'credit' && activeTab === 'withdraw' && (
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <ArrowDownRight className="text-red-400" /> ขอถอนเงิน
                        </h2>

                        <div className="space-y-5">
                            <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                                <p className="text-slate-400 text-sm">เครดิตคงเหลือ</p>
                                <p className="text-3xl font-bold text-white">{walletBalance.toLocaleString()} <span className="text-lg font-normal text-slate-400">TOKEN</span></p>
                            </div>

                            <div>
                                <label className="text-sm text-slate-300 mb-2 block">จำนวนที่ต้องการถอน (TOKEN)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={walletBalance}
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
                                    placeholder="เช่น 100"
                                />
                                <div className="flex gap-2 mt-2">
                                    {[50, 100, 500, 1000].map(val => (
                                        <button key={val} onClick={() => setWithdrawAmount(String(Math.min(val, walletBalance)))}
                                            className="px-3 py-1 text-xs bg-white/10 rounded-lg hover:bg-white/20 transition-all">{val}</button>
                                    ))}
                                    <button onClick={() => setWithdrawAmount(String(walletBalance))}
                                        className="px-3 py-1 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all">ทั้งหมด</button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-slate-300 mb-2 block">บัญชีปลายทาง</label>
                                {loadingBanks ? (
                                    <div className="text-slate-400 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /></div>
                                ) : bankAccounts.length === 0 ? (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                                        <p className="text-yellow-300 text-sm mb-2">ยังไม่มีบัญชีธนาคาร</p>
                                        <button onClick={() => setActiveTab('banks')} className="text-yellow-400 underline text-sm">+ เพิ่มบัญชี</button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {bankAccounts.map(bank => (
                                            <label key={bank.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                selectedBankId === bank.id ? 'bg-blue-500/20 border-blue-500/50' : 'bg-black/30 border-white/10 hover:border-white/30'
                                            }`}>
                                                <input type="radio" name="bank" value={bank.id} checked={selectedBankId === bank.id} onChange={() => setSelectedBankId(bank.id)} className="hidden" />
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                    <Building2 className="text-blue-400" size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-medium text-sm">{bank.bankName}</p>
                                                    <p className="text-slate-400 text-xs">{bank.accountNumber} • {bank.accountName}</p>
                                                </div>
                                                {selectedBankId === bank.id && <CheckCircle className="text-blue-400" size={18} />}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={handleWithdraw} disabled={submittingWithdrawal || bankAccounts.length === 0}
                                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                    submittingWithdrawal || bankAccounts.length === 0 ? 'bg-slate-700 text-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400'
                                }`}>
                                {submittingWithdrawal ? <><Loader2 size={18} className="animate-spin" /> กำลังส่ง...</> : '📤 ส่งคำขอถอนเงิน'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">ประวัติการถอนเงิน</h3>
                        {loadingWithdrawals ? (
                            <div className="text-slate-400 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> กำลังโหลด...</div>
                        ) : withdrawalRequests.length === 0 ? (
                            <div className="text-slate-500 text-sm text-center py-8">ยังไม่มีรายการถอนเงิน</div>
                        ) : (
                            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                {withdrawalRequests.map((request) => {
                                    const meta = statusMeta[request.status] || statusMeta.pending;
                                    const StatusIcon = meta.icon;
                                    return (
                                        <div key={request.id} className="bg-black/40 border border-white/10 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-lg font-bold text-red-400">-{request.amount} TOKEN</p>
                                                <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${meta.className}`}>
                                                    <StatusIcon size={12} /> {meta.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Building2 size={14} /> {request.bankName} • {request.accountNumber}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{request.createdAt?.toDate ? request.createdAt.toDate().toLocaleString('th-TH') : 'รอเวลา'}</p>
                                            {request.status === 'rejected' && request.rejectReason && (
                                                <p className="text-xs text-red-400 mt-2">เหตุผล: {request.rejectReason}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bank Accounts Tab */}
            {mainTab === 'credit' && activeTab === 'banks' && (
                <div className="relative z-10 max-w-2xl">
                    <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Building2 className="text-blue-400" /> บัญชีธนาคารของฉัน
                            </h2>
                            <button onClick={() => setShowAddBankModal(true)}
                                className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/30 transition-all flex items-center gap-2">
                                <Plus size={18} /> เพิ่มบัญชี
                            </button>
                        </div>

                        {loadingBanks ? (
                            <div className="text-slate-400 flex items-center gap-2 justify-center py-8"><Loader2 size={20} className="animate-spin" /> กำลังโหลด...</div>
                        ) : bankAccounts.length === 0 ? (
                            <div className="text-center py-12">
                                <Building2 className="text-slate-600 mx-auto mb-4" size={48} />
                                <p className="text-slate-400">ยังไม่มีบัญชีธนาคาร</p>
                                <button onClick={() => setShowAddBankModal(true)} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl">+ เพิ่มบัญชีแรก</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bankAccounts.map(bank => (
                                    <div key={bank.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                                <Building2 className="text-blue-400" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{bank.bankName}</p>
                                                <p className="text-lg font-mono text-slate-300">{bank.accountNumber}</p>
                                                <p className="text-sm text-slate-400">{bank.accountName}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteBank(bank.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Subscription Tab */}
            {mainTab === 'subscription' && (
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Subscription Status */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                            
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                    subStatus.tier === SUBSCRIPTION_TIERS.PREMIUM ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                    subStatus.tier === SUBSCRIPTION_TIERS.VIP ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                                    'bg-gradient-to-br from-slate-500 to-slate-600'
                                }`}>
                                    {subStatus.tier === SUBSCRIPTION_TIERS.PREMIUM ? <Star className="text-white" size={24} /> :
                                     subStatus.tier === SUBSCRIPTION_TIERS.VIP ? <Crown className="text-white" size={24} /> :
                                     <Sparkles className="text-white" size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{subStatus.tier}</h3>
                                    <p className={`text-sm ${subStatus.isActive ? 'text-green-400' : subStatus.isBlocked ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {subStatus.isActive ? '✓ Active' : subStatus.isBlocked ? '✗ Blocked' : '⚠ Expired'}
                                    </p>
                                </div>
                            </div>

                            {/* Trial Info */}
                            {subStatus.isInTrial && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                                    <p className="text-yellow-300 text-sm font-medium flex items-center gap-2">
                                        <Clock size={16} /> ทดลองใช้ฟรี
                                    </p>
                                    <p className="text-yellow-200 text-xs mt-1">เหลืออีก {subStatus.daysRemaining} วัน</p>
                                </div>
                            )}

                            {/* Block Warning */}
                            {subStatus.isBlocked && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                                    <p className="text-red-300 text-sm font-medium flex items-center gap-2">
                                        <AlertTriangle size={16} /> กรุณาชำระค่าบริการ
                                    </p>
                                    <p className="text-red-200 text-xs mt-1">คุณไม่สามารถใช้งานได้จนกว่าจะชำระเงิน</p>
                                </div>
                            )}

                            {/* Grace Period Warning */}
                            {subStatus.gracePeriodDays > 0 && (
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4">
                                    <p className="text-orange-300 text-sm font-medium flex items-center gap-2">
                                        <AlertTriangle size={16} /> ใกล้หมดอายุ
                                    </p>
                                    <p className="text-orange-200 text-xs mt-1">กรุณาชำระเงินภายใน {subStatus.gracePeriodDays} วัน</p>
                                </div>
                            )}

                            {/* Current Limits */}
                            <div className="space-y-3 mt-4">
                                <h4 className="text-sm text-slate-400 font-medium">Limits ปัจจุบัน</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-black/30 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-purple-400">{subStatus.limits.projects}</p>
                                        <p className="text-xs text-slate-400">Projects</p>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-blue-400">{subStatus.limits.modes}</p>
                                        <p className="text-xs text-slate-400">Modes</p>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-green-400">{subStatus.limits.extenders}</p>
                                        <p className="text-xs text-slate-400">Extenders</p>
                                    </div>
                                </div>
                            </div>

                            {/* Expiry Date */}
                            {subscription?.expiryDate && !subStatus.isInTrial && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <p className="text-xs text-slate-400">
                                        <Calendar size={12} className="inline mr-1" />
                                        หมดอายุ: {formatThaiDate(subscription.expiryDate)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subscription Plans */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Pro Plan Card */}
                        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-purple-500/30 p-6 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />
                            
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                                            <Crown className="text-white" size={28} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white">Pro Plan</h2>
                                            <p className="text-purple-300 text-sm">สมาชิกรายเดือน</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-white">{formatPrice(SUBSCRIPTION_PRICES.PRO_PLAN)}</p>
                                    <p className="text-slate-400 text-sm">/เดือน</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-purple-300">1</p>
                                    <p className="text-xs text-slate-400">Project</p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-blue-300">2</p>
                                    <p className="text-xs text-slate-400">Modes</p>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                                    <p className="text-xl font-bold text-green-300">2</p>
                                    <p className="text-xs text-slate-400">Extenders</p>
                                </div>
                            </div>

                            {/* Extra Projects */}
                            <div className="bg-black/30 rounded-xl p-4 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <Plus size={16} className="text-amber-400" /> เพิ่ม Project
                                        </p>
                                        <p className="text-xs text-slate-400">+{formatPrice(SUBSCRIPTION_PRICES.EXTRA_PROJECT)}/Project/เดือน (+2 Mode, +2 Extender)</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setExtraProjects(Math.max(0, extraProjects - 1))}
                                            className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center justify-center font-bold"
                                            disabled={extraProjects === 0}
                                        >
                                            -
                                        </button>
                                        <span className="w-10 text-center text-xl font-bold text-amber-400">{extraProjects}</span>
                                        <button
                                            onClick={() => setExtraProjects(extraProjects + 1)}
                                            className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all flex items-center justify-center font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                {extraProjects > 0 && (
                                    <div className="text-xs text-amber-300 bg-amber-500/10 rounded-lg p-2 mt-2">
                                        ⭐ อัพเกรดเป็น <span className="font-bold">Premium</span>: {subscriptionPriceInfo.limits.projects} Projects, {subscriptionPriceInfo.limits.modes} Modes, {subscriptionPriceInfo.limits.extenders} Extenders
                                    </div>
                                )}
                            </div>

                            {/* Price Summary */}
                            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-4 mb-6 border border-purple-500/30">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-300">Pro Plan</span>
                                        <span className="text-white font-medium">{formatPrice(subscriptionPriceInfo.breakdown.proPlan)}</span>
                                    </div>
                                    {extraProjects > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-300">เพิ่ม {extraProjects} Project</span>
                                            <span className="text-white font-medium">{formatPrice(subscriptionPriceInfo.breakdown.extraProjects)}</span>
                                        </div>
                                    )}
                                    {subscriptionPriceInfo.prorate && (
                                        <div className="text-xs text-purple-300 pt-2 border-t border-white/10">
                                            <Zap size={12} className="inline mr-1" />
                                            คำนวณตามวันที่เหลือในเดือน ({subscriptionPriceInfo.prorate.proPlan?.daysRemaining || 0} วัน)
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                                        <span className="text-white">รวมทั้งสิ้น</span>
                                        <span className="text-purple-300">{formatPrice(subscriptionPriceInfo.total)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* QR Code & Slip Upload */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-black/30 rounded-xl p-4 flex flex-col items-center">
                                    <p className="text-sm text-slate-400 mb-3">สแกน QR เพื่อชำระเงิน</p>
                                    <PromptPayQR amount={subscriptionPriceInfo.total} size={150} className="border border-purple-500/30" />
                                    <p className="text-lg font-bold text-purple-400 mt-2">฿{subscriptionPriceInfo.total.toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 mt-1">{PROMPTPAY_MASKED}</p>
                                </div>
                                <div className="space-y-3">
                                    <label className="block">
                                        <span className="text-sm text-purple-300 mb-2 block font-medium">แนบสลิปการโอนเงิน</span>
                                        <div className="group flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-purple-500/30 bg-black/30 cursor-pointer hover:border-purple-400 hover:bg-purple-500/5 transition-all duration-300">
                                            <Upload size={20} className="text-purple-300 group-hover:animate-bounce" />
                                            <span className="text-sm text-slate-300">คลิกเพื่ออัปโหลดสลิป</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => setSubSlipFile(e.target.files?.[0] || null)} />
                                        </div>
                                    </label>
                                    {subSlipPreview && (
                                        <div className="relative bg-black/40 rounded-xl border border-purple-500/20 p-2">
                                            <img src={subSlipPreview} alt="Slip preview" className="w-full max-h-32 object-contain rounded-lg" />
                                            <button
                                                onClick={() => setSubSlipFile(null)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-500"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleSubscriptionPayment}
                                        disabled={submittingSub || !subSlipFile}
                                        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-lg ${
                                            submittingSub || !subSlipFile
                                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30 hover:scale-[1.02]'
                                        }`}
                                    >
                                        {submittingSub ? <><Loader2 size={20} className="animate-spin" /> กำลังส่ง...</> : <><Crown size={20} /> สมัครสมาชิก</>}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div className="bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 p-5">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-purple-400" />
                                ประวัติการชำระ Subscription
                            </h3>
                            {loadingSubPayments ? (
                                <div className="text-slate-400 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> กำลังโหลด...</div>
                            ) : subscriptionPayments.length === 0 ? (
                                <div className="text-slate-500 text-sm text-center py-6">ยังไม่มีรายการ</div>
                            ) : (
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                    {subscriptionPayments.map((payment) => {
                                        const meta = statusMeta[payment.status] || statusMeta.pending;
                                        const StatusIcon = meta.icon;
                                        return (
                                            <div key={payment.id} className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-white font-semibold">{formatPrice(payment.amount)}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {payment.type === 'subscription_with_projects' ? `Pro + ${payment.extraProjects} Project` : 'Pro Plan'}
                                                    </p>
                                                    <p className="text-xs text-slate-600">{payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleString('th-TH') : '-'}</p>
                                                </div>
                                                <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${meta.className}`}>
                                                    <StatusIcon size={12} /> {meta.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Bank Modal */}
            {showAddBankModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-white/20 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <CreditCard className="text-blue-400" /> เพิ่มบัญชีธนาคาร
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-300 mb-2 block">ธนาคาร</label>
                                <div className="glass-dropdown-wrapper w-full">
                                    <GlassDropdown
                                        value={newBank.bankCode}
                                        onChange={(newValue) => setNewBank(prev => ({ ...prev, bankCode: newValue }))}
                                        options={[
                                            { value: '', label: '-- เลือกธนาคาร --' },
                                            ...THAI_BANKS.map(bank => ({ value: bank.code, label: bank.name }))
                                        ]}
                                        buttonClassName="glass-dropdown w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-300 mb-2 block">เลขบัญชี</label>
                                <input
                                    type="text"
                                    value={newBank.accountNumber}
                                    onChange={(e) => setNewBank(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono"
                                    placeholder="1234567890"
                                    maxLength={15}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-300 mb-2 block">ชื่อบัญชี (ตามที่ปรากฏในธนาคาร)</label>
                                <input
                                    type="text"
                                    value={newBank.accountName}
                                    onChange={(e) => setNewBank(prev => ({ ...prev, accountName: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="นายสมชาย ใจดี"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowAddBankModal(false); setNewBank({ bankCode: '', accountNumber: '', accountName: '' }); }}
                                className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleAddBank}
                                disabled={savingBank}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {savingBank ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</> : '✓ บันทึกบัญชี'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payments;
