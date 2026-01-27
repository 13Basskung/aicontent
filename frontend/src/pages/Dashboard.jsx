import { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, Wallet, FolderKanban, Share2, Layers, TrendingUp, TrendingDown,
    Clock, Users, Video, Eye, Heart, Play, Search, ChevronDown, Filter, ExternalLink, X,
    Facebook, Instagram, Youtube, Loader2, ArrowUpRight, ArrowDownRight, Link2,
    ShoppingBag, Gift, DollarSign, Activity, BarChart3, PieChart, Calendar,
    CheckCircle, AlertCircle, Zap, Target, Award, Sparkles, CalendarDays, CalendarRange, Download
} from 'lucide-react';
import GlassDropdown from '../components/ui/GlassDropdown';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, doc, onSnapshot, query, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Platform Icon Mapping
const PlatformIcon = ({ platform, size = 16 }) => {
    const icons = {
        facebook: <Facebook size={size} className="text-blue-400" />,
        instagram: <Instagram size={size} className="text-pink-400" />,
        youtube: <Youtube size={size} className="text-red-400" />,
        tiktok: <Video size={size} className="text-cyan-400" />
    };
    return icons[platform?.toLowerCase()] || <Share2 size={size} className="text-slate-400" />;
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subValue, trend, trendUp, color, loading }) => (
    <div className={`group relative bg-gradient-to-br from-${color}-900/30 to-slate-900/50 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-white/10 p-3 md:p-5 hover:border-${color}-500/30 hover:scale-[1.02] md:hover:scale-[1.03] transition-all duration-500 cursor-pointer overflow-hidden`}>
        {/* Animated Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-r from-${color}-500/0 via-${color}-500/5 to-${color}-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000`} />
        <div className={`absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 bg-${color}-500/10 rounded-full blur-3xl group-hover:bg-${color}-500/20 transition-all duration-500`} />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between relative gap-2">
            <div className="flex items-center gap-2 md:gap-4">
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-${color}-400 to-${color}-600 flex items-center justify-center shadow-lg shadow-${color}-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0`}>
                    <Icon className="text-white" size={20} />
                </div>
                <div className="min-w-0">
                    {loading ? (
                        <Loader2 size={20} className="animate-spin text-slate-400" />
                    ) : (
                        <p className="text-xl md:text-3xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-${color}-200 transition-all truncate">{value}</p>
                    )}
                    <p className="text-xs md:text-sm text-slate-400 font-medium truncate">{label}</p>
                    {subValue && <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 truncate">{subValue}</p>}
                </div>
            </div>
            {trend !== undefined && (
                <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold ${trendUp ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20' : 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'}`}>
                    {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {trend}%
                </div>
            )}
        </div>
    </div>
);

// Mini Chart Component (Simple Bar)
const MiniBarChart = ({ data, color }) => {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-1 h-12">
            {data.map((val, i) => (
                <div
                    key={i}
                    className={`w-2 rounded-t bg-gradient-to-t from-${color}-600 to-${color}-400 transition-all hover:opacity-80`}
                    style={{ height: `${(val / max) * 100}%`, minHeight: val > 0 ? '4px' : '2px' }}
                />
            ))}
        </div>
    );
};

export default function Dashboard() {
    const { t } = useTranslation();
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [walletBalance, setWalletBalance] = useState(0);
    const [accounts, setAccounts] = useState([]);
    const [projects, setProjects] = useState([]);
    const [expanders, setExpanders] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [contentQueue, setContentQueue] = useState([]);
    
    // Filter States
    const [platformFilter, setPlatformFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedProjectName, setSelectedProjectName] = useState('');
    
    // Chart Filter States
    const [chartPeriod, setChartPeriod] = useState('7d');
    const [hoveredBar, setHoveredBar] = useState(null);
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
    
    // Auth listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (!user) setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    // Fetch all data when user is authenticated
    useEffect(() => {
        if (!currentUser) return;
        
        const unsubscribes = [];
        
        // Wallet Balance
        unsubscribes.push(
            onSnapshot(doc(db, 'users', currentUser.uid, 'wallet', 'main'), (snap) => {
                setWalletBalance(snap.exists() ? (snap.data().balance || 0) : 0);
            })
        );
        
        // Accounts (Platforms)
        unsubscribes.push(
            onSnapshot(collection(db, 'users', currentUser.uid, 'accounts'), (snap) => {
                setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            })
        );
        
        // Projects
        unsubscribes.push(
            onSnapshot(query(collection(db, 'users', currentUser.uid, 'projects'), orderBy('createdAt', 'desc')), (snap) => {
                setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            })
        );
        
        // Expanders
        unsubscribes.push(
            onSnapshot(collection(db, 'users', currentUser.uid, 'expanders'), (snap) => {
                setExpanders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            })
        );
        
        // Transactions (History)
        unsubscribes.push(
            onSnapshot(query(collection(db, 'users', currentUser.uid, 'transactions'), orderBy('date', 'desc'), limit(10)), (snap) => {
                setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            })
        );
        
        // Content Queue
        unsubscribes.push(
            onSnapshot(collection(db, 'users', currentUser.uid, 'content_queue'), (snap) => {
                setContentQueue(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            })
        );
        
        setLoading(false);
        
        return () => unsubscribes.forEach(unsub => unsub());
    }, [currentUser]);
    
    // Computed Statistics
    const stats = useMemo(() => {
        const totalAccounts = accounts.length;
        const totalFollowers = accounts.reduce((sum, acc) => sum + (acc.followers || 0), 0);
        const totalVideos = accounts.reduce((sum, acc) => sum + (acc.videoCount || 0), 0);
        const totalProjects = projects.length;
        const activeProjects = projects.filter(p => p.status === 'active').length;
        const totalExpanders = expanders.length;
        const publishedExpanders = expanders.filter(e => e.isPublished || e.isPublishedFree).length;
        const pendingQueue = contentQueue.filter(c => c.status === 'pending').length;
        const todayPosts = contentQueue.filter(c => {
            if (!c.scheduledAt) return false;
            const scheduled = c.scheduledAt.seconds ? new Date(c.scheduledAt.seconds * 1000) : new Date(c.scheduledAt);
            const today = new Date();
            return scheduled.toDateString() === today.toDateString();
        }).length;
        
        // Platform breakdown
        const platformStats = {};
        accounts.forEach(acc => {
            const platform = acc.platform?.toLowerCase() || 'other';
            if (!platformStats[platform]) {
                platformStats[platform] = { count: 0, followers: 0, videos: 0 };
            }
            platformStats[platform].count++;
            platformStats[platform].followers += acc.followers || 0;
            platformStats[platform].videos += acc.videoCount || 0;
        });
        
        return {
            totalAccounts, totalFollowers, totalVideos, totalProjects, activeProjects,
            totalExpanders, publishedExpanders, pendingQueue, todayPosts, platformStats
        };
    }, [accounts, projects, expanders, contentQueue]);
    
    // Filtered Accounts for Table
    const filteredAccounts = useMemo(() => {
        let filtered = [...accounts];
        
        // Filter by selected project
        if (selectedProjectId) {
            const selectedProject = projects.find(p => p.id === selectedProjectId);
            if (selectedProject?.linkedAccounts?.length > 0) {
                filtered = filtered.filter(acc => selectedProject.linkedAccounts.includes(acc.id));
            } else {
                // ถ้า Project ไม่มี linkedAccounts ให้แสดงทั้งหมด (หรือไม่แสดงเลย)
                filtered = [];
            }
        }
        
        if (platformFilter !== 'all') {
            filtered = filtered.filter(acc => acc.platform?.toLowerCase() === platformFilter);
        }
        
        if (searchQuery.trim()) {
            const search = searchQuery.toLowerCase();
            filtered = filtered.filter(acc => 
                acc.name?.toLowerCase().includes(search) ||
                acc.platform?.toLowerCase().includes(search)
            );
        }
        
        return filtered;
    }, [accounts, projects, platformFilter, searchQuery, selectedProjectId]);
    
    // Activity Badge Style
    const getActivityBadge = (type) => {
        const badges = {
            purchase: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '💰', label: 'ซื้อ' },
            free: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: '🎁', label: 'รับฟรี' },
            trial: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '⏳', label: 'ทดลอง' },
            publish_free: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '📤', label: 'แจกฟรี' },
            publish_sale: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🏷️', label: 'ขาย' },
            sale_success: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '✅', label: 'ขายได้' },
        };
        return badges[type] || { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: '📋', label: type };
    };
    
    // Chart data based on period filter - ใช้ข้อมูลจริง (ตอนนี้ยังไม่มีข้อมูล)
    const chartData = useMemo(() => {
        let labels = [];
        let postsData = [];
        let followersData = [];
        
        // TODO: เชื่อม API จริงเพื่อดึงข้อมูลสถิติ
        switch (chartPeriod) {
            case '1d':
                labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
                postsData = Array.from({ length: 24 }, () => 0);
                followersData = Array.from({ length: 24 }, () => 0);
                break;
            case '7d':
                labels = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
                postsData = [0, 0, 0, 0, 0, 0, 0];
                followersData = [0, 0, 0, 0, 0, 0, 0];
                break;
            case '1m':
                labels = ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'];
                postsData = [0, 0, 0, 0];
                followersData = [0, 0, 0, 0];
                break;
            case '1y':
                labels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                postsData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                followersData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                break;
            case 'custom':
                labels = ['ช่วงที่เลือก'];
                postsData = [0];
                followersData = [0];
                break;
            default:
                labels = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
                postsData = [0, 0, 0, 0, 0, 0, 0];
                followersData = [0, 0, 0, 0, 0, 0, 0];
        }
        
        const maxPosts = Math.max(...postsData, 1);
        const maxFollowers = Math.max(...followersData, 1);
        
        return { labels, postsData, followersData, maxPosts, maxFollowers };
    }, [chartPeriod, customDateRange]);
    
    // Period filter options
    const periodOptions = [
        { value: '1d', label: '1 วัน', icon: Clock },
        { value: '7d', label: '7 วัน', icon: CalendarDays },
        { value: '1m', label: '1 เดือน', icon: Calendar },
        { value: '1y', label: '1 ปี', icon: CalendarRange },
        { value: 'custom', label: 'กำหนดเอง', icon: Filter },
    ];

    return (
        <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8 gap-4 md:gap-6 bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 text-white font-sans overflow-auto relative">
            {/* Subtle Background Effect */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent" />
            </div>

            {/* Header - Unified Box Style */}
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-3 md:p-4 rounded-2xl shadow-xl overflow-hidden z-10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="relative group">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-300">
                                <LayoutDashboard className="text-white" size={24} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-red-100 to-orange-200 tracking-tight">
                                Dashboard
                            </h1>
                            <p className="text-sm md:text-base text-slate-400 font-light flex items-center gap-2 mt-1">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                                ภาพรวมทั้งหมดในที่เดียว
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <Link
                            to="/learn?section=extension-update"
                            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/40 hover:to-blue-600/40 backdrop-blur-xl rounded-xl border border-purple-500/30 hover:border-purple-500/50 text-xs md:text-sm text-purple-300 hover:text-white transition-all group"
                        >
                            <Download size={16} className="group-hover:animate-bounce" />
                            <span className="font-medium hidden sm:inline">Update Extension</span>
                        </Link>
                        <div className="px-2 md:px-4 py-2 bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 text-xs md:text-sm text-slate-300">
                            <Calendar size={16} className="inline mr-1 md:mr-2 text-orange-400" />
                            <span className="hidden md:inline">{new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span className="md:hidden">{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔥 HERO SUMMARY CARDS - FastClip Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 relative z-10">
                {/* Subscribers Card */}
                <div className="group relative bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-4 md:p-6 overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl shadow-red-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <p className="text-3xl md:text-4xl font-black text-white">
                            {loading ? '...' : stats.totalFollowers.toLocaleString()}
                        </p>
                        <p className="text-red-200 text-sm font-medium mt-1">ผู้ติดตามทั้งหมด</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-red-100">
                            <TrendingUp size={12} />
                            <span>+0 วันนี้</span>
                        </div>
                    </div>
                </div>

                {/* Views Card */}
                <div className="group relative bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-4 md:p-6 overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl shadow-slate-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <p className="text-3xl md:text-4xl font-black text-white">
                            {loading ? '...' : '0'}
                        </p>
                        <p className="text-slate-400 text-sm font-medium mt-1">ยอดวิวทั้งหมด</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                            <Eye size={12} />
                            <span>Views</span>
                        </div>
                    </div>
                </div>

                {/* Videos Card */}
                <div className="group relative bg-gradient-to-br from-pink-600 to-pink-800 rounded-2xl p-4 md:p-6 overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl shadow-pink-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <p className="text-3xl md:text-4xl font-black text-white">
                            {loading ? '...' : stats.totalVideos.toLocaleString()}
                        </p>
                        <p className="text-pink-200 text-sm font-medium mt-1">วีดีโอทั้งหมด</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-pink-100">
                            <Video size={12} />
                            <span>Videos</span>
                        </div>
                    </div>
                </div>

                {/* Scheduled Card */}
                <div className="group relative bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl p-4 md:p-6 overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl shadow-slate-500/20 border border-white/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <p className="text-3xl md:text-4xl font-black text-white">
                            {loading ? '...' : stats.pendingQueue}
                        </p>
                        <p className="text-slate-400 text-sm font-medium mt-1">รอโพสต์</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                            <Clock size={12} />
                            <span>Scheduled</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔥 QUICK ACTIONS - Create Video & Queue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {/* Create Video Button */}
                <Link
                    to="/projects"
                    className="group relative flex items-center gap-4 p-5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl overflow-hidden hover:scale-[1.01] transition-all duration-300 shadow-xl shadow-pink-500/30"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <Play size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white">สร้างวีดีโอใหม่</p>
                        <p className="text-pink-200 text-sm">เริ่มสร้างคอนเทนต์</p>
                    </div>
                </Link>

                {/* Queue Button */}
                <Link
                    to="/content-queue"
                    className="group relative flex items-center gap-4 p-5 bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl overflow-hidden hover:scale-[1.01] transition-all duration-300 shadow-xl shadow-slate-500/20 border border-white/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <Clock size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white">Queue</p>
                        <p className="text-slate-400 text-sm">{stats.pendingQueue} รายการรอดำเนินการ</p>
                    </div>
                </Link>
            </div>

            {/* Charts & Activity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
                {/* Activity Chart */}
                <div className="lg:col-span-2 group relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-orange-500/30 transition-all duration-300 overflow-hidden">
                    {/* Subtle Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/3 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                    <BarChart3 size={20} className="text-white" />
                                </div>
                                กิจกรรมและสถิติ
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">ภาพรวมการใช้งานระบบ</p>
                        </div>
                        
                        {/* Period Filter Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {periodOptions.map((option) => {
                                const Icon = option.icon;
                                const isActive = chartPeriod === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setChartPeriod(option.value);
                                            if (option.value === 'custom') {
                                                setShowCustomDatePicker(true);
                                            } else {
                                                setShowCustomDatePicker(false);
                                            }
                                        }}
                                        className={`group/btn relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                                            isActive
                                                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <Icon size={14} className={`transition-transform duration-300 ${isActive ? 'animate-pulse' : 'group-hover/btn:rotate-12'}`} />
                                        {option.label}
                                        {isActive && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Custom Date Picker */}
                    {showCustomDatePicker && chartPeriod === 'custom' && (
                        <div className="flex items-center gap-3 mb-4 p-3 bg-black/30 rounded-xl border border-white/10">
                            <input
                                type="date"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-slate-500">ถึง</span>
                            <input
                                type="date"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    )}
                    
                    {/* Legend */}
                    <div className="flex items-center gap-6 mb-4 text-sm">
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded shadow-lg shadow-blue-500/30" />
                            <span className="text-slate-300">โพสต์</span>
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded shadow-lg shadow-emerald-500/30" />
                            <span className="text-slate-300">ผู้ติดตามใหม่</span>
                        </span>
                    </div>
                    
                    {/* Enhanced Bar Chart */}
                    <div className="flex items-end justify-between h-48 px-2 gap-1">
                        {chartData.labels.map((label, i) => (
                            <div 
                                key={i} 
                                className="flex flex-col items-center gap-2 flex-1 group/bar"
                                onMouseEnter={() => setHoveredBar(i)}
                                onMouseLeave={() => setHoveredBar(null)}
                            >
                                {/* Tooltip */}
                                {hoveredBar === i && (
                                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-xl px-4 py-3 rounded-xl border border-white/20 shadow-2xl z-50 whitespace-nowrap animate-fadeIn">
                                        <p className="text-xs text-slate-400 mb-1">{label}</p>
                                        <p className="text-sm font-bold text-blue-400 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                            โพสต์: {chartData.postsData[i]}
                                        </p>
                                        <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                                            ผู้ติดตาม: +{chartData.followersData[i].toLocaleString()}
                                        </p>
                                    </div>
                                )}
                                
                                {/* Bars */}
                                <div className="relative flex items-end gap-1 h-36 w-full justify-center">
                                    {/* Posts Bar */}
                                    <div 
                                        className={`w-5 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 cursor-pointer shadow-lg ${
                                            hoveredBar === i ? 'shadow-blue-500/50 scale-110 opacity-100' : 'shadow-blue-500/20 opacity-80 hover:opacity-100'
                                        }`}
                                        style={{ 
                                            height: `${(chartData.postsData[i] / chartData.maxPosts) * 100}%`, 
                                            minHeight: '12px',
                                            transform: hoveredBar === i ? 'scaleY(1.05)' : 'scaleY(1)',
                                            transformOrigin: 'bottom'
                                        }}
                                    />
                                    {/* Followers Bar */}
                                    <div 
                                        className={`w-5 bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-500 cursor-pointer shadow-lg ${
                                            hoveredBar === i ? 'shadow-emerald-500/50 scale-110 opacity-100' : 'shadow-emerald-500/20 opacity-80 hover:opacity-100'
                                        }`}
                                        style={{ 
                                            height: `${(chartData.followersData[i] / chartData.maxFollowers) * 100}%`, 
                                            minHeight: '12px',
                                            transform: hoveredBar === i ? 'scaleY(1.05)' : 'scaleY(1)',
                                            transformOrigin: 'bottom'
                                        }}
                                    />
                                </div>
                                
                                {/* Label */}
                                <span className={`text-xs transition-all duration-300 ${
                                    hoveredBar === i ? 'text-white font-bold scale-110' : 'text-slate-500'
                                }`}>
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <p className="text-2xl font-black text-blue-400">{chartData.postsData.reduce((a, b) => a + b, 0)}</p>
                            <p className="text-xs text-slate-400">โพสต์ทั้งหมด</p>
                        </div>
                        <div className="text-center p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <p className="text-2xl font-black text-emerald-400">+{chartData.followersData.reduce((a, b) => a + b, 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-400">ผู้ติดตามใหม่</p>
                        </div>
                        <div className="text-center p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <p className="text-2xl font-black text-purple-400">{Math.round(chartData.postsData.reduce((a, b) => a + b, 0) / chartData.labels.length)}</p>
                            <p className="text-xs text-slate-400">เฉลี่ยโพสต์/ช่วง</p>
                        </div>
                        <div className="text-center p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                            <p className="text-2xl font-black text-orange-400">{Math.max(...chartData.postsData)}</p>
                            <p className="text-xs text-slate-400">โพสต์สูงสุด</p>
                        </div>
                    </div>
                </div>

                {/* Platform Distribution */}
                <div className="group relative bg-gradient-to-br from-purple-900/30 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 p-6 hover:border-purple-500/30 transition-all duration-500 overflow-hidden">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:animate-pulse">
                            <PieChart size={20} className="text-white" />
                        </div>
                        แพลตฟอร์มของคุณ
                    </h3>
                    
                    <div className="space-y-4">
                        {Object.entries(stats.platformStats).length > 0 ? (
                            Object.entries(stats.platformStats).map(([platform, data]) => {
                                const colors = {
                                    facebook: 'blue', instagram: 'pink', youtube: 'red', tiktok: 'cyan'
                                };
                                const color = colors[platform] || 'slate';
                                // ใช้ข้อมูลจริง - คำนวณ % จาก followers (ถ้ามี) หรือจากจำนวน Account
                                const totalFollowersAll = stats.totalFollowers || 1;
                                const percentage = stats.totalFollowers > 0 
                                    ? Math.round((data.followers / totalFollowersAll) * 100) 
                                    : Math.round((data.count / stats.totalAccounts) * 100);
                                
                                return (
                                    <div key={platform} className="group/item p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-all duration-300 cursor-pointer hover:scale-[1.02]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg bg-${color}-500/20 flex items-center justify-center`}>
                                                    <PlatformIcon platform={platform} size={18} />
                                                </div>
                                                <span className="text-sm font-semibold text-white capitalize">{platform}</span>
                                            </div>
                                            <span className="text-xs text-slate-400">{data.count} บัญชี</span>
                                        </div>
                                        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full bg-gradient-to-r from-${color}-600 to-${color}-400 rounded-full transition-all duration-500 group-hover/item:shadow-lg group-hover/item:shadow-${color}-500/30`}
                                                style={{ width: `${Math.max(percentage, 5)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-400 mt-2">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} /> 
                                                {data.followers > 0 ? data.followers.toLocaleString() : 'รอข้อมูล'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Video size={12} /> 
                                                {data.videos > 0 ? `${data.videos} วีดีโอ` : 'รอข้อมูล'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-10 text-slate-500">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                                    <Share2 size={32} className="opacity-50" />
                                </div>
                                <p className="text-sm mb-2">ยังไม่มีแพลตฟอร์มเชื่อมต่อ</p>
                                <Link to="/platforms" className="inline-flex items-center gap-1 text-purple-400 text-sm hover:underline font-semibold">
                                    เพิ่มแพลตฟอร์ม <ArrowUpRight size={14} />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 🔥 PROJECTS TABLE - FastClip Style */}
            <div className="group relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden z-10">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 md:p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white">Projects</h3>
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">{projects.length}</span>
                        <div className="hidden md:flex items-center gap-2 ml-4">
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Youtube size={12} className="text-red-400" /> {stats.platformStats?.youtube?.count || 0}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Facebook size={12} className="text-blue-400" /> {stats.platformStats?.facebook?.count || 0}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Instagram size={12} className="text-pink-400" /> {stats.platformStats?.instagram?.count || 0}
                            </span>
                        </div>
                    </div>
                    
                    {/* Filters & Actions */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="ค้นหา..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 transition-all w-40"
                            />
                        </div>
                        <Link
                            to="/projects/new"
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-red-500/20"
                        >
                            <Sparkles size={14} />
                            <span className="hidden sm:inline">New Project</span>
                        </Link>
                    </div>
                </div>
                
                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Project</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-red-400 uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1">
                                        <Youtube size={12} /> Subs
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Views</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-pink-400 uppercase tracking-wider">Videos</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                                    <div className="flex items-center justify-center gap-1">
                                        <Facebook size={12} /> Followers
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Scheduled</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">สถานะ</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center">
                                        <Loader2 size={32} className="animate-spin mx-auto text-slate-400" />
                                    </td>
                                </tr>
                            ) : projects.length > 0 ? (
                                projects.slice(0, 10).map((project) => (
                                    <tr key={project.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="py-3 px-4">
                                            <div 
                                                className="flex items-center gap-3 cursor-pointer group/project"
                                                onClick={() => {
                                                    if (selectedProjectId === project.id) {
                                                        setSelectedProjectId(null);
                                                        setSelectedProjectName('');
                                                    } else {
                                                        setSelectedProjectId(project.id);
                                                        setSelectedProjectName(project.name);
                                                    }
                                                }}
                                            >
                                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border transition-all ${selectedProjectId === project.id ? 'border-red-500 ring-2 ring-red-500/30' : 'border-white/10 group-hover/project:border-red-500/50'}`}>
                                                    <FolderKanban size={18} className="text-red-400" />
                                                </div>
                                                <div>
                                                    <p className={`font-semibold text-sm transition-colors ${selectedProjectId === project.id ? 'text-red-400' : 'text-white group-hover/project:text-red-400'}`}>{project.name || 'Untitled'}</p>
                                                    <p className="text-xs text-slate-500">{project.scenes || 0} scenes</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-white font-bold">{(project.subscribers || 0).toLocaleString()}</span>
                                                <span className="text-xs text-green-400">+0</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-white font-bold">{(project.views || 0).toLocaleString()}</span>
                                                <span className="text-xs text-slate-500">views</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-white font-bold">{project.videoCount || 0}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-white font-bold">{(project.followers || 0).toLocaleString()}</span>
                                                <span className="text-xs text-green-400">+0</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-xs text-slate-400">
                                                {project.lastScheduled ? new Date(project.lastScheduled.seconds * 1000).toLocaleDateString('th-TH') : '-'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                                                project.status === 'active' 
                                                    ? 'bg-green-500/20 text-green-400' 
                                                    : 'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {project.status === 'active' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                                {project.status === 'active' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link
                                                    to={`/projects/${project.id}`}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                                                    title="View"
                                                >
                                                    <Eye size={14} className="text-slate-400 hover:text-white" />
                                                </Link>
                                                <button className="p-2 hover:bg-red-500/20 rounded-lg transition-all" title="Play">
                                                    <Play size={14} className="text-red-400" />
                                                </button>
                                                <button className="p-2 hover:bg-blue-500/20 rounded-lg transition-all" title="Share">
                                                    <Share2 size={14} className="text-blue-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-500">
                                        <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-lg font-semibold mb-1">ยังไม่มี Project</p>
                                        <p className="text-sm mb-4">สร้าง Project แรกของคุณเลย!</p>
                                        <Link to="/projects/new" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-red-500 hover:to-rose-500 transition-all">
                                            <Sparkles size={16} /> สร้าง Project
                                        </Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer */}
                {projects.length > 10 && (
                    <div className="p-4 border-t border-white/10 text-center">
                        <Link to="/projects" className="text-sm text-red-400 hover:text-red-300 font-semibold">
                            ดูทั้งหมด ({projects.length}) →
                        </Link>
                    </div>
                )}
            </div>

            {/* Platform Accounts Table - FastClip Style */}
            <div className={`group relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border overflow-hidden z-10 transition-all ${selectedProjectId ? 'border-red-500/50 ring-2 ring-red-500/20' : 'border-white/10'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 md:p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${selectedProjectId ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20' : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/20'}`}>
                            <Share2 size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                Platform Accounts
                                {selectedProjectId && (
                                    <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 animate-pulse">
                                        → {selectedProjectName}
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {selectedProjectId 
                                    ? `แสดงเฉพาะ Account ที่เชื่อมกับ "${selectedProjectName}"`
                                    : 'บัญชีที่เชื่อมต่อทั้งหมด'
                                }
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {selectedProjectId && (
                            <button
                                onClick={() => {
                                    setSelectedProjectId(null);
                                    setSelectedProjectName('');
                                }}
                                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-all flex items-center gap-2"
                            >
                                <X size={14} /> ดูทั้งหมด
                            </button>
                        )}
                        <GlassDropdown
                            value={platformFilter}
                            onChange={setPlatformFilter}
                            options={[
                                { value: 'all', label: 'ทุกแพลตฟอร์ม' },
                                { value: 'facebook', label: 'Facebook' },
                                { value: 'instagram', label: 'Instagram' },
                                { value: 'youtube', label: 'YouTube' },
                                { value: 'tiktok', label: 'TikTok' }
                            ]}
                            buttonClassName="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">บัญชี</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">แพลตฟอร์ม</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors">
                                        ผู้ติดตาม <ChevronDown size={12} />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors">
                                        วันนี้ <ChevronDown size={12} />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors">
                                        วีดีโอ <ChevronDown size={12} />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-cyan-400 uppercase">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors">
                                        <Eye size={12} /> Views <ChevronDown size={12} />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-orange-400 uppercase">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors">
                                        <Calendar size={12} /> Last Scheduled <ChevronDown size={12} />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-yellow-400 uppercase">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors">
                                        <Clock size={12} /> รอโพสต์ <ChevronDown size={12} />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-purple-400 uppercase">
                                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors">
                                        <Link2 size={12} /> Links <ChevronDown size={12} />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center">
                                        <Loader2 size={32} className="animate-spin mx-auto text-slate-400" />
                                    </td>
                                </tr>
                            ) : filteredAccounts.length > 0 ? (
                                filteredAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={account.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name || 'A')}&background=random`} 
                                                    alt={account.name}
                                                    className="w-8 h-8 rounded-lg border border-white/10"
                                                />
                                                <div>
                                                    <p className="font-medium text-white text-sm">{account.name || 'Unnamed'}</p>
                                                    <p className="text-xs text-slate-500">{account.id.substring(0, 15)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <PlatformIcon platform={account.platform} size={16} />
                                                <span className="text-sm text-slate-300 capitalize">{account.platform}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-white font-medium">{(account.followers || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-green-400 text-sm font-medium">+{account.followersToday || 0}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-white">{account.videoCount || 0}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-cyan-400 font-medium">{(account.views || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-orange-400 text-xs">
                                                {account.lastScheduled 
                                                    ? new Date(account.lastScheduled.seconds ? account.lastScheduled.seconds * 1000 : account.lastScheduled).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                    : '-'
                                                }
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                (account.pendingPosts || 0) > 0 
                                                    ? 'bg-yellow-500/20 text-yellow-400' 
                                                    : 'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {account.pendingPosts || 0}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {account.platform?.toLowerCase() === 'youtube' && account.channelUrl && (
                                                    <a href={account.channelUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-red-500/20 rounded-lg transition-all" title="YouTube">
                                                        <Youtube size={14} className="text-red-400" />
                                                    </a>
                                                )}
                                                {account.platform?.toLowerCase() === 'facebook' && account.pageUrl && (
                                                    <a href={account.pageUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-all" title="Facebook">
                                                        <Facebook size={14} className="text-blue-400" />
                                                    </a>
                                                )}
                                                {account.platform?.toLowerCase() === 'instagram' && account.profileUrl && (
                                                    <a href={account.profileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-pink-500/20 rounded-lg transition-all" title="Instagram">
                                                        <Instagram size={14} className="text-pink-400" />
                                                    </a>
                                                )}
                                                {account.platform?.toLowerCase() === 'tiktok' && account.profileUrl && (
                                                    <a href={account.profileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-cyan-500/20 rounded-lg transition-all" title="TikTok">
                                                        <Video size={14} className="text-cyan-400" />
                                                    </a>
                                                )}
                                                {/* Default link icon if no specific URL */}
                                                {!account.channelUrl && !account.pageUrl && !account.profileUrl && (
                                                    <span className="text-slate-600 text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {/* สถานะตามเงื่อนไขจริง */}
                                            {(() => {
                                                // ตรวจสอบว่ามี Token/ID จริงหรือไม่
                                                const hasRealConnection = account.accessToken || account.channelId || account.pageId || account.igUserId;
                                                const isExpired = account.tokenExpiry && new Date(account.tokenExpiry.seconds ? account.tokenExpiry.seconds * 1000 : account.tokenExpiry) < new Date();
                                                const hasError = account.connectionError;
                                                
                                                if (hasError) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                                                            <AlertCircle size={10} /> Error
                                                        </span>
                                                    );
                                                }
                                                if (isExpired) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full">
                                                            <Clock size={10} /> Expired
                                                        </span>
                                                    );
                                                }
                                                if (hasRealConnection) {
                                                    return (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                                                            <CheckCircle size={10} /> Connected
                                                        </span>
                                                    );
                                                }
                                                // ไม่มี Token = ยังไม่ได้เชื่อมต่อจริง แค่สร้าง Label
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                                                        <AlertCircle size={10} /> Pending
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-500">
                                        <Share2 size={32} className="mx-auto mb-3 opacity-30" />
                                        <p className="font-medium mb-2">ยังไม่มีบัญชีเชื่อมต่อ</p>
                                        <p className="text-xs text-slate-600">ระบบจะดึงข้อมูลอัตโนมัติจาก Posting Schedule</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                {[
                    { to: '/projects', icon: FolderKanban, label: 'จัดการโปรเจค', color: 'blue', desc: 'จัดการโปรเจคโพสต์' },
                    { to: '/platforms', icon: Share2, label: 'เพิ่มแพลตฟอร์ม', color: 'green', desc: 'เชื่อมต่อบัญชีใหม่' },
                    { to: '/expander', icon: Layers, label: 'สร้าง Expander', color: 'orange', desc: 'สร้างเนื้อหาอัตโนมัติ' },
                    { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace', color: 'purple', desc: 'ซื้อขาย Expander' },
                ].map((action, i) => (
                    <Link
                        key={i}
                        to={action.to}
                        className={`group relative flex flex-col gap-3 p-5 bg-gradient-to-br from-${action.color}-900/30 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-${action.color}-500/50 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-${action.color}-500/20 overflow-hidden`}
                    >
                        {/* Glow Effect */}
                        <div className={`absolute inset-0 bg-gradient-to-r from-${action.color}-500/0 via-${action.color}-500/10 to-${action.color}-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000`} />
                        
                        <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-${action.color}-400 to-${action.color}-600 flex items-center justify-center shadow-lg shadow-${action.color}-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                <action.icon className="text-white" size={28} />
                            </div>
                            <div>
                                <span className="font-bold text-white text-lg block">{action.label}</span>
                                <span className="text-xs text-slate-400">{action.desc}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-end">
                            <span className={`inline-flex items-center gap-1 text-${action.color}-400 text-sm font-semibold group-hover:translate-x-1 transition-transform`}>
                                ไปเลย <ArrowUpRight size={16} />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
