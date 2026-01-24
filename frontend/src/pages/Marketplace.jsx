import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Star, Download, Clock, History, LayoutGrid, CheckCircle, Loader2, Sparkles, Gift, ShoppingCart, Filter, X, Coins, AlertCircle, Store, MoreVertical, Play, ExternalLink, Wallet, ChevronDown, Trash2 } from 'lucide-react';
import GlassDropdown from '../components/ui/GlassDropdown';
import { db, auth } from '../firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, updateDoc, increment, getDoc, runTransaction, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useConfirmModal } from '../hooks/useConfirmModal';

// CATEGORIES ต้องตรงกับ ExpanderCreator.jsx
const CATEGORIES = [
    { id: 'all', name: 'ทั้งหมด', icon: '🏠' },
    { id: 'Cinematic / Movie', name: 'Cinematic / Movie', icon: '🎬' },
    { id: 'Short Film / Story', name: 'Short Film / Story', icon: '📖' },
    { id: 'Product Showcase / Commercial', name: 'Product Showcase / Commercial', icon: '🛍️' },
    { id: 'Real Estate / Architecture', name: 'Real Estate / Architecture', icon: '🏠' },
    { id: 'Vlog / Lifestyle', name: 'Vlog / Lifestyle', icon: '📷' },
    { id: 'Time-lapse / Hyper-lapse', name: 'Time-lapse / Hyper-lapse', icon: '⏱️' },
    { id: 'Documentary / News', name: 'Documentary / News', icon: '📰' },
    { id: 'How-to / Tutorial', name: 'How-to / Tutorial', icon: '📚' },
    { id: 'Relaxation / Lo-fi / ASMR', name: 'Relaxation / Lo-fi / ASMR', icon: '🎧' },
];

// ตัวอย่าง Expanders สำหรับแสดงเมื่อยังไม่มี Expander จริงใน Marketplace
const SAMPLE_MARKETPLACE_DATA = [
    {
        id: 'sample_001',
        name: 'Thai Drama Pro',
        author: 'Content Auto Post Team',
        sellerName: 'Content Auto Post Team',
        rating: 4.9,
        downloads: 2450,
        description: 'Expander สำหรับละครไทย มี Blocks: ภาษาไทย, Cinematic, Emotional, Golden Hour, BGM Soft',
        coverImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2070&auto=format&fit=crop',
        tags: ['Drama', 'Thai', 'Cinematic'],
        category: 'Cinematic / Movie',
        price: 15,
        allowTrial: true,
        trialDays: 3,
        trialFee: 0,
        blocks: [
            { id: 'block_th', name: '🇹🇭 ภาษาไทย', color: 'bg-blue-500', instruction: 'All spoken dialogue must be in Thai language.' },
            { id: 'block_cinematic', name: '🎬 Cinematic', color: 'bg-purple-500', instruction: 'Use cinematic camera angles.' },
            { id: 'block_emotional', name: '🎭 Emotional', color: 'bg-pink-500', instruction: 'Focus on character emotions.' },
            { id: 'block_golden', name: '🌅 Golden Hour', color: 'bg-amber-500', instruction: 'Warm golden sunlight.' },
            { id: 'block_bgm_soft', name: '🎵 BGM Soft', color: 'bg-green-500', instruction: 'Soft piano background music.' }
        ]
    },
    {
        id: 'sample_002',
        name: 'Epic Action Pack',
        author: 'Studio X',
        sellerName: 'Studio X',
        rating: 4.8,
        downloads: 1890,
        description: 'Expander สำหรับฉากแอคชั่น มี Blocks: English, Cinematic, Night Scene, BGM Epic, Ambient',
        coverImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025&auto=format&fit=crop',
        tags: ['Action', 'Epic', 'Night'],
        category: 'Cinematic / Movie',
        price: 25,
        allowTrial: true,
        trialDays: 5,
        trialFee: 1,
        blocks: [
            { id: 'block_en', name: '🇬🇧 English', color: 'bg-red-500', instruction: 'All dialogue in English.' },
            { id: 'block_cinematic', name: '🎬 Cinematic', color: 'bg-purple-500', instruction: 'Use cinematic camera angles.' },
            { id: 'block_night', name: '🌙 Night Scene', color: 'bg-indigo-500', instruction: 'Night time setting.' },
            { id: 'block_bgm_epic', name: '🎵 BGM Epic', color: 'bg-orange-500', instruction: 'Epic orchestral music.' },
            { id: 'block_ambient', name: '🔊 Ambient', color: 'bg-teal-500', instruction: 'Include ambient sounds.' }
        ]
    },
    {
        id: 'sample_003',
        name: 'Anime Style Creator',
        author: 'AnimeFX',
        sellerName: 'AnimeFX',
        rating: 4.7,
        downloads: 5670,
        description: 'Expander สไตล์อนิเมะ มี Blocks: ภาษาไทย, Anime Style, Emotional, BGM Soft',
        coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2070&auto=format&fit=crop',
        tags: ['Anime', 'Style', 'Creative'],
        category: 'Short Film / Story',
        price: 10,
        allowTrial: true,
        trialDays: 3,
        trialFee: 0,
        blocks: [
            { id: 'block_th', name: '🇹🇭 ภาษาไทย', color: 'bg-blue-500', instruction: 'Thai language dialogue.' },
            { id: 'block_anime', name: '✨ Anime Style', color: 'bg-rose-500', instruction: 'Anime visual style.' },
            { id: 'block_emotional', name: '🎭 Emotional', color: 'bg-pink-500', instruction: 'Focus on emotions.' },
            { id: 'block_bgm_soft', name: '🎵 BGM Soft', color: 'bg-green-500', instruction: 'Soft music.' }
        ]
    },
    {
        id: 'sample_004',
        name: 'Romantic Sunset',
        author: 'LoveStory AI',
        sellerName: 'LoveStory AI',
        rating: 4.9,
        downloads: 3200,
        description: 'Expander สำหรับฉากโรแมนติก มี Blocks: ภาษาไทย, Golden Hour, Emotional, BGM Soft, Ambient',
        coverImage: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2070&auto=format&fit=crop',
        tags: ['Romance', 'Sunset', 'Emotional'],
        category: 'Short Film / Story',
        price: 20,
        allowTrial: true,
        trialDays: 7,
        trialFee: 2,
        blocks: [
            { id: 'block_th', name: '🇹🇭 ภาษาไทย', color: 'bg-blue-500', instruction: 'Thai language.' },
            { id: 'block_golden', name: '🌅 Golden Hour', color: 'bg-amber-500', instruction: 'Golden hour lighting.' },
            { id: 'block_emotional', name: '🎭 Emotional', color: 'bg-pink-500', instruction: 'Emotional focus.' },
            { id: 'block_bgm_soft', name: '🎵 BGM Soft', color: 'bg-green-500', instruction: 'Soft romantic music.' },
            { id: 'block_ambient', name: '🔊 Ambient', color: 'bg-teal-500', instruction: 'Nature ambient sounds.' }
        ]
    }
];

// FREE EXPANDERS - สำหรับ User ใหม่ (Category ละ 2)
const FREE_EXPANDERS = [
    // 🎬 Cinematic / Movie
    {
        id: 'free_cinematic_001',
        name: 'Basic Cinematic Starter',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.5,
        downloads: 15000,
        description: 'Expander พื้นฐานสำหรับสร้างวิดีโอสไตล์ Cinematic ฟรี! เหมาะสำหรับผู้เริ่มต้น',
        coverImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=2070&auto=format&fit=crop',
        tags: ['Cinematic', 'Starter', 'Free'],
        category: 'Cinematic / Movie',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_cinematic', name: '🎬 Cinematic', color: 'bg-purple-500', instruction: 'Use cinematic camera angles and movements.' },
            { id: 'block_widescreen', name: '📽️ Widescreen', color: 'bg-slate-500', instruction: '21:9 aspect ratio cinematic bars.' }
        ]
    },
    {
        id: 'free_cinematic_002',
        name: 'Movie Trailer Basics',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.6,
        downloads: 12500,
        description: 'สร้าง Trailer หนังแบบง่ายๆ ด้วย Expander ฟรีนี้!',
        coverImage: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=2070&auto=format&fit=crop',
        tags: ['Trailer', 'Movie', 'Free'],
        category: 'Cinematic / Movie',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_dramatic', name: '🎭 Dramatic', color: 'bg-red-500', instruction: 'Dramatic pacing and tension.' },
            { id: 'block_bgm_epic', name: '🎵 BGM Epic', color: 'bg-orange-500', instruction: 'Epic trailer music.' }
        ]
    },
    // 📖 Short Film / Story
    {
        id: 'free_story_001',
        name: 'Simple Story Maker',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.4,
        downloads: 18000,
        description: 'สร้างเรื่องราวง่ายๆ ด้วย Expander ฟรี เหมาะสำหรับ Short Film',
        coverImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2070&auto=format&fit=crop',
        tags: ['Story', 'Simple', 'Free'],
        category: 'Short Film / Story',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_narrative', name: '📝 Narrative', color: 'bg-blue-500', instruction: 'Focus on storytelling and narrative.' },
            { id: 'block_emotional', name: '🎭 Emotional', color: 'bg-pink-500', instruction: 'Emotional character moments.' }
        ]
    },
    {
        id: 'free_story_002',
        name: 'Mini Documentary',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.5,
        downloads: 14000,
        description: 'Expander สำหรับสร้าง Mini Documentary แบบเรียบง่าย',
        coverImage: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2071&auto=format&fit=crop',
        tags: ['Documentary', 'Mini', 'Free'],
        category: 'Short Film / Story',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_interview', name: '🎤 Interview', color: 'bg-teal-500', instruction: 'Interview style shots.' },
            { id: 'block_broll', name: '🎥 B-Roll', color: 'bg-indigo-500', instruction: 'Supporting B-roll footage.' }
        ]
    },
    // 🛍️ Product Showcase / Commercial
    {
        id: 'free_product_001',
        name: 'Product Showcase Lite',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.7,
        downloads: 22000,
        description: 'แสดงสินค้าของคุณอย่างมืออาชีพด้วย Expander ฟรี!',
        coverImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop',
        tags: ['Product', 'Showcase', 'Free'],
        category: 'Product Showcase / Commercial',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_product', name: '📦 Product Focus', color: 'bg-amber-500', instruction: 'Clean product shots on white background.' },
            { id: 'block_rotate', name: '🔄 360 Rotate', color: 'bg-cyan-500', instruction: '360 degree product rotation.' }
        ]
    },
    {
        id: 'free_product_002',
        name: 'Simple Commercial',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.6,
        downloads: 19000,
        description: 'สร้างโฆษณาง่ายๆ สำหรับสินค้าของคุณ',
        coverImage: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=2051&auto=format&fit=crop',
        tags: ['Commercial', 'Simple', 'Free'],
        category: 'Product Showcase / Commercial',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_lifestyle', name: '✨ Lifestyle', color: 'bg-rose-500', instruction: 'Product in lifestyle context.' },
            { id: 'block_cta', name: '📢 Call to Action', color: 'bg-green-500', instruction: 'Clear call to action ending.' }
        ]
    },
    // 🏠 Real Estate / Architecture
    {
        id: 'free_realestate_001',
        name: 'Property Tour Basic',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.5,
        downloads: 16000,
        description: 'Expander สำหรับถ่ายทัวร์บ้าน/คอนโด แบบพื้นฐาน',
        coverImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop',
        tags: ['Property', 'Tour', 'Free'],
        category: 'Real Estate / Architecture',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_walkthrough', name: '🚶 Walkthrough', color: 'bg-blue-500', instruction: 'Smooth walking tour through property.' },
            { id: 'block_wide', name: '🏠 Wide Shots', color: 'bg-slate-500', instruction: 'Wide angle room shots.' }
        ]
    },
    {
        id: 'free_realestate_002',
        name: 'Architecture Highlight',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.4,
        downloads: 11000,
        description: 'เน้นความสวยงามทางสถาปัตยกรรม',
        coverImage: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=2070&auto=format&fit=crop',
        tags: ['Architecture', 'Design', 'Free'],
        category: 'Real Estate / Architecture',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_detail', name: '🔍 Detail Shots', color: 'bg-amber-500', instruction: 'Close-up architectural details.' },
            { id: 'block_symmetry', name: '📐 Symmetry', color: 'bg-purple-500', instruction: 'Symmetrical compositions.' }
        ]
    },
    // 📷 Vlog / Lifestyle
    {
        id: 'free_vlog_001',
        name: 'Daily Vlog Starter',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.8,
        downloads: 35000,
        description: 'เริ่มต้นทำ Vlog ง่ายๆ ด้วย Expander ฟรียอดนิยม!',
        coverImage: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=1974&auto=format&fit=crop',
        tags: ['Vlog', 'Daily', 'Free'],
        category: 'Vlog / Lifestyle',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_talking', name: '🗣️ Talking Head', color: 'bg-blue-500', instruction: 'Person talking to camera.' },
            { id: 'block_broll', name: '🎥 B-Roll', color: 'bg-indigo-500', instruction: 'Lifestyle B-roll footage.' }
        ]
    },
    {
        id: 'free_vlog_002',
        name: 'Travel Vlog Lite',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.7,
        downloads: 28000,
        description: 'Expander สำหรับ Travel Vlog แบบเบาๆ',
        coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop',
        tags: ['Travel', 'Vlog', 'Free'],
        category: 'Vlog / Lifestyle',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_scenic', name: '🏞️ Scenic', color: 'bg-green-500', instruction: 'Beautiful scenic shots.' },
            { id: 'block_pov', name: '👁️ POV', color: 'bg-cyan-500', instruction: 'Point of view walking shots.' }
        ]
    },
    // ⏱️ Time-lapse / Hyper-lapse
    {
        id: 'free_timelapse_001',
        name: 'Basic Time-lapse',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.6,
        downloads: 20000,
        description: 'สร้าง Time-lapse พื้นฐานได้ง่ายๆ',
        coverImage: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2044&auto=format&fit=crop',
        tags: ['Timelapse', 'City', 'Free'],
        category: 'Time-lapse / Hyper-lapse',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_timelapse', name: '⏱️ Time-lapse', color: 'bg-orange-500', instruction: 'Time-lapse effect.' },
            { id: 'block_static', name: '📷 Static', color: 'bg-slate-500', instruction: 'Fixed camera position.' }
        ]
    },
    {
        id: 'free_timelapse_002',
        name: 'Sunset Time-lapse',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.7,
        downloads: 17000,
        description: 'จับภาพพระอาทิตย์ตกแบบ Time-lapse',
        coverImage: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?q=80&w=2032&auto=format&fit=crop',
        tags: ['Sunset', 'Nature', 'Free'],
        category: 'Time-lapse / Hyper-lapse',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_golden', name: '🌅 Golden Hour', color: 'bg-amber-500', instruction: 'Golden hour lighting.' },
            { id: 'block_smooth', name: '🎞️ Smooth', color: 'bg-purple-500', instruction: 'Smooth motion interpolation.' }
        ]
    },
    // 📰 Documentary / News
    {
        id: 'free_documentary_001',
        name: 'News Report Basic',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.5,
        downloads: 13000,
        description: 'Expander สำหรับสร้างรายงานข่าวแบบพื้นฐาน',
        coverImage: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=2069&auto=format&fit=crop',
        tags: ['News', 'Report', 'Free'],
        category: 'Documentary / News',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_anchor', name: '📺 Anchor', color: 'bg-red-500', instruction: 'News anchor style presentation.' },
            { id: 'block_graphics', name: '📊 Graphics', color: 'bg-blue-500', instruction: 'News graphics and lower thirds.' }
        ]
    },
    {
        id: 'free_documentary_002',
        name: 'Interview Setup',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.4,
        downloads: 10000,
        description: 'การจัดฉากสัมภาษณ์แบบมืออาชีพ',
        coverImage: 'https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?q=80&w=2071&auto=format&fit=crop',
        tags: ['Interview', 'Professional', 'Free'],
        category: 'Documentary / News',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_twoshot', name: '👥 Two Shot', color: 'bg-teal-500', instruction: 'Two person interview framing.' },
            { id: 'block_lighting', name: '💡 Soft Light', color: 'bg-yellow-500', instruction: 'Soft interview lighting.' }
        ]
    },
    // 📚 How-to / Tutorial
    {
        id: 'free_tutorial_001',
        name: 'Tutorial Starter',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.8,
        downloads: 42000,
        description: 'Expander ยอดนิยมสำหรับสร้างวิดีโอสอน!',
        coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop',
        tags: ['Tutorial', 'Education', 'Free'],
        category: 'How-to / Tutorial',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_screen', name: '🖥️ Screen Record', color: 'bg-blue-500', instruction: 'Screen recording with voiceover.' },
            { id: 'block_steps', name: '📋 Step by Step', color: 'bg-green-500', instruction: 'Clear numbered steps.' }
        ]
    },
    {
        id: 'free_tutorial_002',
        name: 'Cooking Tutorial',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.6,
        downloads: 25000,
        description: 'สำหรับทำวิดีโอสอนทำอาหาร',
        coverImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop',
        tags: ['Cooking', 'Food', 'Free'],
        category: 'How-to / Tutorial',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_overhead', name: '⬇️ Overhead', color: 'bg-amber-500', instruction: 'Top-down cooking shots.' },
            { id: 'block_closeup', name: '🔍 Close-up', color: 'bg-rose-500', instruction: 'Close-up food details.' }
        ]
    },
    // 🎧 Relaxation / Lo-fi / ASMR
    {
        id: 'free_lofi_001',
        name: 'Lo-fi Study Vibes',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.9,
        downloads: 50000,
        description: 'Expander ยอดนิยมที่สุด! สร้างวิดีโอ Lo-fi สำหรับอ่านหนังสือ',
        coverImage: 'https://images.unsplash.com/photo-1519682577862-22b62b24e493?q=80&w=2070&auto=format&fit=crop',
        tags: ['Lofi', 'Study', 'Free'],
        category: 'Relaxation / Lo-fi / ASMR',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_lofi', name: '🎵 Lo-fi BGM', color: 'bg-purple-500', instruction: 'Lo-fi hip hop background music.' },
            { id: 'block_cozy', name: '☕ Cozy', color: 'bg-amber-500', instruction: 'Cozy room atmosphere.' }
        ]
    },
    {
        id: 'free_lofi_002',
        name: 'Rain & Chill',
        author: 'Content Auto Post',
        sellerName: 'Content Auto Post',
        rating: 4.8,
        downloads: 38000,
        description: 'เสียงฝนตกผ่อนคลาย สำหรับวิดีโอ Relaxation',
        coverImage: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=2070&auto=format&fit=crop',
        tags: ['Rain', 'Relaxation', 'Free'],
        category: 'Relaxation / Lo-fi / ASMR',
        price: 0,
        isFree: true,
        allowTrial: false,
        blocks: [
            { id: 'block_rain', name: '🌧️ Rain Sound', color: 'bg-blue-500', instruction: 'Gentle rain ambient sound.' },
            { id: 'block_ambient', name: '🔊 Ambient', color: 'bg-teal-500', instruction: 'Peaceful ambient atmosphere.' }
        ]
    }
];

const Marketplace = () => {
    const { showAlert, showConfirm, showSuccess, showError } = useConfirmModal();
    const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'history'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showMyListings, setShowMyListings] = useState(false); // Filter: แสดงเฉพาะที่กำลังขาย
    const [showMyFreePublish, setShowMyFreePublish] = useState(false); // Filter: แสดงเฉพาะที่กำลังเผยแพร่ฟรี
    const [showFreeExpanders, setShowFreeExpanders] = useState(false); // Filter: แสดงเฉพาะ FREE
    const [isInstalling, setIsInstalling] = useState(null); // ID of item being installed
    const [isTrialing, setIsTrialing] = useState(null); // ID of item being trialed
    const [currentUser, setCurrentUser] = useState(null);
    const [installHistory, setInstallHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [userExpanders, setUserExpanders] = useState([]); // Expanders from marketplace_expanders
    const [isLoadingExpanders, setIsLoadingExpanders] = useState(false);
    const [purchasedIds, setPurchasedIds] = useState([]); // IDs ที่ซื้อแล้ว
    const [trialHistory, setTrialHistory] = useState({}); // { expanderId: { expiresAt, status } }
    const [showTrialModal, setShowTrialModal] = useState(null); // Expander to show trial modal
    const [canceledTrialIds, setCanceledTrialIds] = useState([]); // IDs ที่เคยทดลองแล้วยกเลิก (ห้ามทดลองซ้ำ)
    const [openVideoMenu, setOpenVideoMenu] = useState(null); // ID ของ item ที่เปิด video menu อยู่
    const [walletBalance, setWalletBalance] = useState(0); // เครดิตคงเหลือ
    const [walletLoading, setWalletLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); // Admin can delete any expander
    const [isDeleting, setIsDeleting] = useState(null); // ID of expander being deleted

    // Fetch user-published expanders from Firestore
    const fetchMarketplaceExpanders = async () => {
        setIsLoadingExpanders(true);
        console.log('🔍 Starting to fetch marketplace_expanders...');
        try {
            const collectionRef = collection(db, 'marketplace_expanders');
            console.log('📁 Collection ref:', collectionRef.path);
            
            const snapshot = await getDocs(collectionRef);
            console.log('✅ Marketplace expanders found:', snapshot.docs.length);
            
            if (snapshot.docs.length === 0) {
                console.log('⚠️ No expanders in marketplace_expanders collection');
            }
            
            const expanders = snapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    const isActive = data.status === 'active' || !data.status;
                    console.log(`📦 ${data.name}: status=${data.status}, isActive=${isActive}`);
                    return isActive;
                })
                .map(doc => {
                    const data = doc.data();
                    console.log('📦 Expander raw data:', doc.id, data);
                    return {
                        id: doc.id,
                        ...data,
                        // Map fields
                        author: data.sellerName || 'Unknown',
                        rating: data.rating || 4.5,
                        downloads: data.downloads || 0,
                        coverImage: data.thumbnail || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2070&auto=format&fit=crop',
                        tags: [data.categoryId?.split(' ')[0] || data.category?.split(' ')[0] || 'Custom'],
                        category: data.categoryId || data.category || 'Custom',
                        price: data.price || 0,
                        // Trial fields - ถ้ามี trialDays > 0 ให้ allowTrial เป็น true
                        allowTrial: data.allowTrial ?? (data.trialDays > 0),
                        trialDays: data.trialDays || 0,
                        trialFee: data.trialFee || 0
                    };
                });
            
            console.log('🎯 Final expanders to display:', expanders.length, expanders);
            setUserExpanders(expanders);
        } catch (error) {
            console.error('❌ Error fetching marketplace expanders:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
        } finally {
            setIsLoadingExpanders(false);
        }
    };

    useEffect(() => {
        fetchMarketplaceExpanders();
    }, []);
    
    // ปิด Video Menu เมื่อคลิกที่อื่น
    useEffect(() => {
        const handleClickOutside = () => setOpenVideoMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                fetchUserData(user.uid);
                if (activeTab === 'history') {
                    fetchHistory(user.uid);
                }
                // Check if user is admin
                try {
                    const userSnap = await getDoc(doc(db, 'users', user.uid));
                    setIsAdmin(userSnap.data()?.role === 'admin');
                } catch (error) {
                    console.error('Failed to check admin role:', error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, [activeTab]);

    // Fetch user's purchased expanders and trial history
    const fetchUserData = async (uid) => {
        try {
            // Fetch purchased expanders
            const purchasedSnap = await getDocs(collection(db, 'users', uid, 'purchasedExpanders'));
            const purchasedIdsList = purchasedSnap.docs.map(doc => doc.data().originalId || doc.id);
            setPurchasedIds(purchasedIdsList);
            
            // Fetch trial history
            const trialSnap = await getDocs(collection(db, 'users', uid, 'trialHistory'));
            const trialMap = {};
            trialSnap.docs.forEach(doc => {
                const data = doc.data();
                const now = new Date();
                const expiresAt = data.expiresAt?.toDate() || new Date(0);
                trialMap[doc.id] = {
                    ...data,
                    status: expiresAt > now ? 'active' : 'expired',
                    daysLeft: Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)))
                };
            });
            setTrialHistory(trialMap);
            
            // Fetch canceled trials (ห้ามทดลองซ้ำ)
            const canceledSnap = await getDocs(collection(db, 'users', uid, 'canceledTrials'));
            const canceledIds = canceledSnap.docs.map(doc => doc.id);
            setCanceledTrialIds(canceledIds);

            // Fetch wallet balance
            setWalletLoading(true);
            const walletRef = doc(db, 'users', uid, 'wallet', 'main');
            const walletSnap = await getDoc(walletRef);
            if (!walletSnap.exists()) {
                await setDoc(walletRef, {
                    balance: 0,
                    updatedAt: serverTimestamp()
                });
                setWalletBalance(0);
            } else {
                setWalletBalance(walletSnap.data()?.balance || 0);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setWalletLoading(false);
        }
    };

    const fetchHistory = async (uid) => {
        setIsLoadingHistory(true);
        try {
            const q = query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInstallHistory(history);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };
    
    // Get item status for current user
    const getItemStatus = (item) => {
        const itemId = item.originalId || item.id;
        if (item.sellerId === currentUser?.uid) return 'own_listing';
        if (purchasedIds.includes(itemId)) return 'owned';
        if (trialHistory[itemId]?.status === 'active') return 'trialing';
        if (trialHistory[itemId]?.status === 'expired') return 'trial_expired';
        return 'available';
    };

    // === PURCHASE EXPANDER ===
    const handlePurchase = async (item) => {
        if (!currentUser) {
            showAlert('🔐 กรุณาเข้าสู่ระบบก่อน', '⚠️ แจ้งเตือน');
            return;
        }
        
        const price = item.price || 0;
        if (price > 0 && walletBalance < price) {
            showAlert('❌ เครดิตไม่เพียงพอ\nกรุณาเติมเครดิตก่อน', '⚠️ แจ้งเตือน');
            return;
        }
        if (price > 0) {
            const confirmed = await showConfirm(`🛒 ยืนยันซื้อ\n\n"🎯 ${item.name}"\n💰 ราคา: ${price} TOKEN`, '🤔 ยืนยันซื้อ');
            if (!confirmed) return;
        }
        
        setIsInstalling(item.id);

        try {
            const platformFee = Math.floor(price * 0.10);
            const sellerReceives = price - platformFee;
            
            // 1. Save to purchasedExpanders (ไม่ใส่ fromSellerId ถ้าเป็น FREE)
            const purchaseData = {
                ...item,
                originalId: item.originalId || item.id,
                purchasedAt: serverTimestamp(),
                price: price
            };
            
            // เพิ่ม fromSellerId เฉพาะเมื่อมีค่า (ไม่ใช่ FREE)
            if (item.sellerId) {
                purchaseData.fromSellerId = item.sellerId;
            }
            
            await setDoc(doc(db, 'users', currentUser.uid, 'purchasedExpanders', item.originalId || item.id), purchaseData);

            // 2. Record Transaction to user's history (บันทึกทั้ง FREE และ PAID)
            await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
                type: price > 0 ? 'purchase' : 'free',
                itemName: item.name,
                coverImage: item.coverImage || item.thumbnail || '',
                expanderId: item.originalId || item.id,
                amount: price,
                sellerId: item.sellerId || 'system',
                sellerName: item.sellerName || item.author || 'Content Auto Post',
                date: serverTimestamp()
            });
            
            // Also record to global transactions (for admin/analytics)
            if (price > 0) {
                await addDoc(collection(db, 'transactions'), {
                    type: 'purchase',
                    buyerId: currentUser.uid,
                    buyerName: currentUser.displayName || currentUser.email,
                    sellerId: item.sellerId || 'system',
                    sellerName: item.sellerName || item.author || 'Content Auto Post',
                    expanderId: item.originalId || item.id,
                    expanderName: item.name,
                    amount: price,
                    platformFee: platformFee,
                    sellerReceived: sellerReceives,
                    createdAt: serverTimestamp()
                });
            }
            
            // 3. Update download count
            if (item.sellerId) {
                try {
                    await updateDoc(doc(db, 'marketplace_expanders', item.id), {
                        downloads: increment(1)
                    });
                } catch (e) { console.log('Could not update download count'); }
            }

            // 4. Copy to My Expanders (users/{uid}/expanders) - เพื่อให้ใช้งานได้จริง
            const expanderBlocks = item.blocks || [];
            await addDoc(collection(db, 'users', currentUser.uid, 'expanders'), {
                name: item.name,
                description: item.description || '',
                categoryId: item.categoryId || item.category || 'Custom',
                blocks: expanderBlocks,
                thumbnail: item.thumbnail || item.coverImage || '',
                // Video URLs - ติดไปกับผู้ซื้อ (จะหายเมื่อเพิ่ม/ลบ Block)
                videoUrls: item.videoUrls || [],
                // Source tracking - สำคัญ! เพื่อไม่นับรวมใน limit
                source: 'purchased',
                fromMarketplace: true,
                receivedFree: item.isFree || price === 0, // บอกว่าได้มาฟรีหรือไม่
                originalExpanderId: item.originalId || item.id,
                originalAuthor: item.author || item.sellerName || 'Content Auto Post',
                originalBlocks: expanderBlocks, // เก็บ blocks ต้นฉบับเพื่อเปรียบเทียบ
                purchasedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // 5. Deduct wallet balance (เฉพาะเมื่อมีราคา)
            if (price > 0) {
                const walletRef = doc(db, 'users', currentUser.uid, 'wallet', 'main');
                await runTransaction(db, async (transaction) => {
                    const walletSnap = await transaction.get(walletRef);
                    const currentBalance = walletSnap.exists() ? (walletSnap.data()?.balance || 0) : 0;
                    if (currentBalance < price) {
                        throw new Error('เครดิตไม่เพียงพอ');
                    }
                    transaction.set(walletRef, {
                        balance: currentBalance - price,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                });
            }

            // 6. Refresh user data
            await fetchUserData(currentUser.uid);
            
            // แสดง message ตามราคา
            const successMessage = price > 0 
                ? `✅ ซื้อ "${item.name}" สำเร็จ!`
                : `🎁 รับ "${item.name}" ฟรีแล้ว!`;
            showSuccess(`${successMessage}\n\n👉 ไปที่ Expander Creator > My Expander เพื่อใช้งาน`, '✅ สำเร็จ');

        } catch (error) {
            console.error("Purchase failed:", error);
            showError('❌ เกิดข้อผิดพลาด\n' + error.message, '🚫 ผิดพลาด');
        } finally {
            setIsInstalling(null);
        }
    };
    
    // === START TRIAL ===
    const handleStartTrial = async (item) => {
        if (!currentUser) {
            showAlert('🔐 กรุณาเข้าสู่ระบบก่อน', '⚠️ แจ้งเตือน');
            return;
        }
        
        const itemId = item.originalId || item.id;
        const trialFee = item.trialFee || 0;
        const trialDays = item.trialDays || 3;

        if (trialFee > 0 && walletBalance < trialFee) {
            showAlert('❌ เครดิตไม่เพียงพอสำหรับทดลอง\nกรุณาเติมเครดิตก่อน', '⚠️ แจ้งเตือน');
            return;
        }
        
        if (trialFee > 0) {
            const confirmed = await showConfirm(`🧪 ทดลองใช้\n\n"🎯 ${item.name}"\n⏰ ${trialDays} วัน\n💰 ค่าใช้จ่าย: ${trialFee} TOKEN`, '🤔 ยืนยัน');
            if (!confirmed) return;
        }
        
        setIsTrialing(item.id);
        setShowTrialModal(null);

        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + trialDays);
            
            // 1. Save to trialHistory
            await setDoc(doc(db, 'users', currentUser.uid, 'trialHistory', itemId), {
                ...item,
                originalId: itemId,
                startedAt: serverTimestamp(),
                expiresAt: expiresAt,
                feePaid: trialFee,
                sellerId: item.sellerId
            });
            
            // 2. Copy Expander ไปยัง My Expander (แบบ trial - read only)
            await addDoc(collection(db, 'users', currentUser.uid, 'expanders'), {
                name: item.name,
                description: item.description,
                categoryId: item.categoryId || item.category,
                blocks: item.blocks || [],
                thumbnail: item.thumbnail || item.coverImage,
                // Video URLs - ติดไปกับผู้ทดลองใช้
                videoUrls: item.videoUrls || [],
                // Source tracking - สำคัญ! เพื่อไม่นับรวมใน limit
                source: 'purchased',
                // Trial flags - ห้ามแก้ไข
                isTrial: true,
                trialExpiresAt: expiresAt,
                trialFromSellerId: item.sellerId,
                trialFromSellerName: item.sellerName,
                originalExpanderId: itemId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // 3. Record Transaction to user's history (trial)
            await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
                type: 'trial',
                itemName: item.name,
                coverImage: item.coverImage || item.thumbnail || '',
                expanderId: itemId,
                amount: trialFee,
                trialDays: trialDays,
                sellerId: item.sellerId || 'system',
                sellerName: item.sellerName || 'Content Auto Post',
                date: serverTimestamp()
            });
            
            // Also record to global transactions (if fee > 0)
            if (trialFee > 0) {
                await addDoc(collection(db, 'transactions'), {
                    type: 'trial',
                    buyerId: currentUser.uid,
                    sellerId: item.sellerId,
                    expanderId: itemId,
                    expanderName: item.name,
                    amount: trialFee,
                    trialDays: trialDays,
                    createdAt: serverTimestamp()
                });

                const walletRef = doc(db, 'users', currentUser.uid, 'wallet', 'main');
                await runTransaction(db, async (transaction) => {
                    const walletSnap = await transaction.get(walletRef);
                    const currentBalance = walletSnap.exists() ? (walletSnap.data()?.balance || 0) : 0;
                    if (currentBalance < trialFee) {
                        throw new Error('เครดิตไม่เพียงพอ');
                    }
                    transaction.set(walletRef, {
                        balance: currentBalance - trialFee,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                });
            }

            // 4. Refresh user data
            await fetchUserData(currentUser.uid);
            
            showSuccess(`🎁 เริ่มทดลองใช้ "${item.name}" แล้ว!\n\n⏰ ใช้ได้ ${trialDays} วัน\n👉 ไปที่ Expander > My Expander เพื่อใช้งาน`, '✅ สำเร็จ');

        } catch (error) {
            console.error("Trial failed:", error);
            showError('❌ เกิดข้อผิดพลาด\n' + error.message, '🚫 ผิดพลาด');
        } finally {
            setIsTrialing(null);
        }
    };

    // === ADMIN: DELETE EXPANDER ===
    const handleAdminDeleteExpander = async (item) => {
        if (!isAdmin) return;
        
        // ป้องกันการลบ FREE_EXPANDERS (Hardcoded items)
        if (item.isFree || item.id.startsWith('free_') || item.id.startsWith('sample_')) {
            showAlert('⚠️ ไม่สามารถลบ Free Expander ได้\n\nFree Expanders เป็นข้อมูลระบบ ไม่ได้อยู่ใน Database', '🚫 ไม่อนุญาต');
            return;
        }
        
        const confirmed = await showConfirm(`🗑️ ยืนยันลบ\n\n"🎯 ${item.name}"\nออกจาก Marketplace?\n\n⚠️ การกระทำนี้ไม่สามารถยกเลิกได้!`, '⚠️ ยืนยันลบ');
        if (!confirmed) return;
        
        setIsDeleting(item.id);
        try {
            // Delete from marketplace_expanders collection
            await deleteDoc(doc(db, 'marketplace_expanders', item.id));
            
            // Optimistically remove from local state immediately
            setUserExpanders(prev => prev.filter(exp => exp.id !== item.id));
            
            showSuccess(`✅ ลบ "${item.name}" ออกจาก Marketplace แล้ว`, '✅ สำเร็จ');
        } catch (error) {
            console.error('Delete failed:', error);
            showError('❌ ลบไม่สำเร็จ\n' + error.message, '🚫 ผิดพลาด');
            // Refresh to restore state if delete failed
            await fetchMarketplaceExpanders();
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="min-h-screen flex flex-col p-8 gap-8 bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 text-white font-sans overflow-hidden">
            {/* Subtle Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[100px]"></div>
            </div>

            {/* Header Section - Unified Style */}
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl overflow-hidden z-10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-300">
                                <ShoppingBag className="text-white" size={32} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-red-100 to-orange-200 tracking-tight">
                                Expander Marketplace
                            </h1>
                            <p className="text-base text-slate-400 font-light mt-1">ค้นหาและติดตั้ง Expander สำหรับขยาย Prompt ให้เป็น Premium Quality</p>
                        </div>
                    </div>

                {/* Navigation Tabs */}
                <div className="flex bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 gap-2">
                    <button
                        onClick={() => setActiveTab('browse')}
                        className={`group relative px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'browse'
                                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-500/40'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <LayoutGrid size={18} className={`transition-transform duration-300 ${activeTab === 'browse' ? '' : 'group-hover:rotate-12'}`} /> Browse Store
                        {activeTab === 'browse' && <span className="absolute inset-0 rounded-xl bg-white/10" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`group relative px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${activeTab === 'history'
                                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-500/40'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <History size={18} className={`transition-transform duration-300 ${activeTab === 'history' ? '' : 'group-hover:rotate-12'}`} /> My History
                        {activeTab === 'history' && <span className="absolute inset-0 rounded-xl bg-white/10" />}
                    </button>
                </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 relative z-10 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-1">

                {/* VIEW 1: BROWSE */}
                {activeTab === 'browse' && (
                    <div className="h-full flex flex-col animate-fade-in-up">
                        {/* Search & Filter Toolbar */}
                        <div className="p-6 border-b border-white/5 bg-black/20">
                            <div className="flex flex-col gap-4">
                                {/* แถวบน: ปุ่ม Filter หลัก + TOKEN */}
                                <div className="flex items-center justify-between">
                                    {/* ปุ่ม Filter หลัก */}
                                    <div className="inline-flex gap-2 items-center bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
                                        {/* ปุ่มทั้งหมด */}
                                        <button
                                            onClick={() => { setSelectedCategory('all'); setShowMyListings(false); setShowMyFreePublish(false); setShowFreeExpanders(false); }}
                                            className={`group relative px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                                                selectedCategory === 'all' && !showMyListings && !showMyFreePublish && !showFreeExpanders
                                                    ? 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-lg shadow-red-500/40 scale-105'
                                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <LayoutGrid size={18} className={`transition-transform duration-300 ${selectedCategory === 'all' && !showMyListings && !showMyFreePublish && !showFreeExpanders ? 'animate-bounce' : 'group-hover:rotate-12'}`} />
                                            ทั้งหมด
                                            {selectedCategory === 'all' && !showMyListings && !showMyFreePublish && !showFreeExpanders && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />}
                                        </button>
                                        
                                        {/* ปุ่ม FREE EXPANDER */}
                                        <button
                                            onClick={() => { setShowFreeExpanders(!showFreeExpanders); setShowMyListings(false); setShowMyFreePublish(false); setSelectedCategory('all'); }}
                                            className={`group relative px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                                                showFreeExpanders
                                                    ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg shadow-green-500/40 scale-105'
                                                    : 'text-emerald-400 hover:bg-emerald-500/20'
                                            }`}
                                        >
                                            <Gift size={18} className={`transition-transform duration-300 ${showFreeExpanders ? 'animate-bounce' : 'group-hover:rotate-12'}`} />
                                            FREE EXPANDER
                                            {showFreeExpanders && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />}
                                        </button>
                                        
                                        {/* ปุ่มกำลังขายอยู่ */}
                                        <button
                                            onClick={() => { setShowMyListings(!showMyListings); setShowMyFreePublish(false); setShowFreeExpanders(false); setSelectedCategory('all'); }}
                                            className={`group relative px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                                                showMyListings
                                                    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/40 scale-105'
                                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <Store size={18} className={`transition-transform duration-300 ${showMyListings ? 'animate-bounce' : 'group-hover:rotate-12'}`} />
                                            กำลังขายอยู่
                                            {showMyListings && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />}
                                        </button>
                                        
                                        {/* ปุ่มกำลังเผยแพร่ฟรี */}
                                        <button
                                            onClick={() => { setShowMyFreePublish(!showMyFreePublish); setShowMyListings(false); setShowFreeExpanders(false); setSelectedCategory('all'); }}
                                            className={`group relative px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                                                showMyFreePublish
                                                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400 text-white shadow-lg shadow-yellow-500/40 scale-105'
                                                    : 'text-yellow-400 hover:bg-yellow-500/20'
                                            }`}
                                        >
                                            <Gift size={18} className={`transition-transform duration-300 ${showMyFreePublish ? 'animate-bounce' : 'group-hover:rotate-12'}`} />
                                            กำลังเผยแพร่ฟรี
                                            {showMyFreePublish && <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />}
                                        </button>
                                    </div>
                                    
                                    {/* TOKEN */}
                                    <div className="group relative px-5 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600/30 to-pink-600/30 backdrop-blur-xl text-purple-200 border border-purple-500/30 shadow-lg shadow-purple-500/20 flex items-center gap-2">
                                        <Wallet size={18} className="text-purple-400" />
                                        {walletLoading ? 'กำลังโหลด...' : `${walletBalance} TOKEN`}
                                    </div>
                                </div>
                                
                                {/* แถวล่าง: Search + Dropdown Category (ชิดซ้าย ความยาวเท่าแถวบน) */}
                                <div className="flex items-center gap-4">
                                    {/* Search */}
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            placeholder="ค้นหา Expander..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all"
                                        />
                                    </div>
                                    
                                    {/* Dropdown Category */}
                                    <div className="glass-dropdown-wrapper min-w-[200px]">
                                        <GlassDropdown
                                            value={selectedCategory === 'all' ? '' : selectedCategory}
                                            onChange={(newValue) => {
                                                setSelectedCategory(newValue || 'all');
                                                setShowMyListings(false);
                                                setShowMyFreePublish(false);
                                            }}
                                            options={[
                                                { value: '', label: 'เลือก Category' },
                                                ...CATEGORIES.filter(cat => cat.id !== 'all').map(cat => ({
                                                    value: cat.id,
                                                    label: `${cat.icon} ${cat.name}`
                                                }))
                                            ]}
                                            buttonClassName="glass-dropdown pr-10 w-full"
                                        />
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Marketplace Grid - รวม User Expanders + FREE Expanders */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                                {(showFreeExpanders ? FREE_EXPANDERS : [...userExpanders, ...FREE_EXPANDERS])
                                    .filter(item => {
                                        // Filter by search
                                        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                                        // Filter by category
                                        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
                                        
                                        // Filter: FREE EXPANDER - แสดงเฉพาะ isFree
                                        if (showFreeExpanders) {
                                            return item.isFree === true;
                                        }
                                        
                                        const status = getItemStatus(item);
                                        
                                        // Filter: กำลังขายอยู่ - แสดงเฉพาะ own_listing (ไม่รวม free)
                                        if (showMyListings) {
                                            return status === 'own_listing' && !item.isFree;
                                        }
                                        
                                        // Filter: กำลังเผยแพร่ฟรี - แสดงเฉพาะ own_listing ที่ isFree
                                        if (showMyFreePublish) {
                                            return status === 'own_listing' && item.isFree === true;
                                        }
                                        
                                        // แสดงทุกสินค้า รวมถึงที่ซื้อแล้ว (owned) - ซื้อซ้ำได้ไม่จำกัด
                                        return true;
                                    })
                                    .map((item, index) => {
                                        const status = getItemStatus(item);
                                        const itemId = item.originalId || item.id;
                                        const price = item.price || 0;
                                        const hasTrial = item.allowTrial && item.trialDays > 0;
                                        
                                        return (
                                    <div key={`${item.id}-${index}`} className="group bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col">
                                        {/* Image Section */}
                                        <div className="h-48 bg-gray-900 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                                            <img
                                                src={item.coverImage}
                                                alt={item.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                            />
                                            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                                                {/* Video Menu Button - แสดงเฉพาะถ้ามี videoUrls */}
                                                {item.videoUrls?.length > 0 && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenVideoMenu(openVideoMenu === item.id ? null : item.id);
                                                            }}
                                                            className="bg-purple-500/80 backdrop-blur-md p-1.5 rounded-lg text-white border border-purple-400/30 shadow-xl hover:bg-purple-500 transition-all"
                                                            title="ดูตัวอย่างวีดีโอ"
                                                        >
                                                            <Play size={14} fill="currentColor" />
                                                        </button>
                                                        {/* Dropdown Video List */}
                                                        {openVideoMenu === item.id && (
                                                            <div className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-2 min-w-[200px] z-50">
                                                                <p className="text-xs text-slate-400 px-2 pb-2 border-b border-white/10 mb-2">🎬 ตัวอย่างวีดีโอ ({item.videoUrls.length})</p>
                                                                {item.videoUrls.map((url, idx) => (
                                                                    <a
                                                                        key={idx}
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white transition-all group"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <Play size={14} className="text-purple-400 group-hover:text-purple-300" />
                                                                        <span className="flex-1 truncate">VDO {idx + 1}</span>
                                                                        <ExternalLink size={12} className="text-slate-500 group-hover:text-white" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Rating Badge */}
                                                <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold text-yellow-400 border border-white/10 shadow-xl">
                                                    <Star size={12} fill="currentColor" /> {item.rating}
                                                </div>
                                                {/* Admin Delete Button */}
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAdminDeleteExpander(item);
                                                        }}
                                                        disabled={isDeleting === item.id}
                                                        className="bg-red-500/80 backdrop-blur-md p-1.5 rounded-lg text-white border border-red-400/30 shadow-xl hover:bg-red-600 transition-all disabled:opacity-50"
                                                        title="Admin: ลบ Expander นี้"
                                                    >
                                                        {isDeleting === item.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            {/* Trial Badge */}
                                            {status === 'trialing' && (
                                                <div className="absolute top-3 left-3 z-20 bg-blue-500 px-2 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                                                    <Clock size={12} /> เหลือ {trialHistory[itemId]?.daysLeft} วัน
                                                </div>
                                            )}
                                            {/* FREE Badge with Countdown */}
                                            {item.isFree && (
                                                <div className="absolute top-3 left-3 z-20 bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 rounded-lg text-xs font-black text-white flex items-center gap-1.5 shadow-lg shadow-green-500/30 border border-green-400/30">
                                                    🎁 FREE
                                                    {item.freeUntil && (() => {
                                                        const now = new Date();
                                                        const until = item.freeUntil.seconds ? new Date(item.freeUntil.seconds * 1000) : new Date(item.freeUntil);
                                                        const diff = until - now;
                                                        if (diff <= 0) return null;
                                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                        return <span className="ml-1 font-mono">{days}D {hours}H</span>;
                                                    })()}
                                                </div>
                                            )}
                                            {/* Owned Badge - เคยซื้อแล้ว */}
                                            {status === 'owned' && !item.isFree && (
                                                <div className="absolute top-3 left-3 z-20 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-orange-500/30 border border-orange-400/30">
                                                    ✅ เคยซื้อแล้ว
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-5 flex flex-col gap-4 flex-1">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] uppercase tracking-widest text-red-300 font-extrabold bg-red-900/30 px-2 py-1 rounded border border-red-500/20">
                                                        {item.tags?.[0] || item.category?.split('/')[0] || 'Custom'}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                        <Download size={14} /> {(item.downloads || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors leading-tight mb-2">
                                                    {item.name}
                                                </h3>
                                                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed opacity-80">
                                                    {item.description}
                                                </p>
                                            </div>

                                            <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
                                                {/* Price Display */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-lg font-bold text-white flex items-center gap-1">
                                                        {price > 0 ? <><Coins size={18} className="text-yellow-400" /> {price} TOKEN</> : 'Free'}
                                                    </span>
                                                    {item.sellerName && (
                                                        <span className="text-xs text-slate-500">by {item.sellerName}</span>
                                                    )}
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex gap-2">
                                                    {/* Own Listing - แสดงข้อความตามสถานะ */}
                                                    {status === 'own_listing' ? (
                                                        item.isFree ? (
                                                            <span className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-400 flex items-center justify-center gap-2 border border-yellow-500/30">
                                                                <Gift size={16} /> กำลังเผยแพร่ฟรี
                                                            </span>
                                                        ) : (
                                                            <span className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-500/20 text-green-400 flex items-center justify-center gap-2 border border-green-500/30">
                                                                <Store size={16} /> ประกาศขายอยู่
                                                            </span>
                                                        )
                                                    ) : (
                                                        <>
                                                            {/* Trial Button */}
                                                            {hasTrial && status === 'available' && !canceledTrialIds.includes(itemId) && (
                                                                <button
                                                                    onClick={() => setShowTrialModal(item)}
                                                                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <Gift size={16} /> ทดลอง {item.trialDays} วัน
                                                                </button>
                                                            )}
                                                            {/* เคยทดลองแล้วยกเลิก - ห้ามทดลองซ้ำ */}
                                                            {hasTrial && status === 'available' && canceledTrialIds.includes(itemId) && (
                                                                <span className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-slate-700/50 text-slate-500 flex items-center justify-center gap-2">
                                                                    <AlertCircle size={16} /> เคยทดลองแล้ว
                                                                </span>
                                                            )}
                                                            {status === 'trial_expired' && (
                                                                <span className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-slate-700/50 text-slate-500 flex items-center justify-center gap-2">
                                                                    <AlertCircle size={16} /> หมดสิทธิ์ทดลอง
                                                                </span>
                                                            )}
                                                            {status === 'trialing' && (
                                                                <span className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-500/20 text-blue-400 flex items-center justify-center gap-2">
                                                                    <Clock size={16} /> กำลังทดลอง
                                                                </span>
                                                            )}
                                                            
                                                            {/* Buy Button */}
                                                            <button
                                                                onClick={() => handlePurchase(item)}
                                                                disabled={isInstalling === item.id}
                                                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                                                                    isInstalling === item.id
                                                                        ? 'bg-slate-700 text-slate-300 cursor-wait'
                                                                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400'
                                                                }`}
                                                            >
                                                                {isInstalling === item.id ? (
                                                                    <><Loader2 size={16} className="animate-spin" /> กำลังซื้อ...</>
                                                                ) : (
                                                                    <><ShoppingCart size={16} /> {price > 0 ? 'ซื้อเลย' : 'รับฟรี'}</>
                                                                )}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW 2: HISTORY */}
                {activeTab === 'history' && (
                    <div className="h-full flex flex-col p-6 animate-fade-in-up">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white mb-1">Installation History</h2>
                            <p className="text-slate-400 text-sm">Review your past Expander acquisitions.</p>
                        </div>

                        {isLoadingHistory ? (
                            <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4">
                                <Loader2 size={40} className="animate-spin text-red-500" />
                                <p>Retrieving transaction logs...</p>
                            </div>
                        ) : installHistory.length > 0 ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="space-y-3">
                                    {installHistory.map((log) => {
                                        // กำหนด badge ตาม type
                                        const getBadgeStyle = () => {
                                            switch(log.type) {
                                                case 'purchase':
                                                    return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: '💰', label: `ซื้อ ${log.amount || 0} TOKEN` };
                                                case 'free':
                                                    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: '🎁', label: 'รับฟรี' };
                                                case 'trial':
                                                    return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', icon: '⏳', label: `ทดลอง ${log.trialDays || 3} วัน` };
                                                case 'publish_free':
                                                    return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', icon: '📤', label: `แจกฟรี ${log.freeDays || 3} วัน` };
                                                case 'publish_sale':
                                                    return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', icon: '🏷️', label: `ขาย ${log.price || 0} TOKEN` };
                                                case 'sale_success':
                                                    return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: '✅', label: `ขายได้ +${log.amount || 0} TOKEN` };
                                                case 'cancel_sale':
                                                    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: '❌', label: 'ยกเลิกขาย' };
                                                case 'cancel_free':
                                                    return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: '🚫', label: 'ยกเลิกแจกฟรี' };
                                                default:
                                                    return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: '✓', label: 'Installed' };
                                            }
                                        };
                                        const badge = getBadgeStyle();
                                        
                                        return (
                                        <div key={log.id} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-black/40 hover:border-red-500/20 transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 rounded-xl bg-gray-900 overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                                                    {log.coverImage && <img src={log.coverImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-white group-hover:text-red-300 transition-colors">{log.itemName}</h4>
                                                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                        <Clock size={12} /> {log.date ? new Date(log.date.seconds * 1000).toLocaleString('th-TH') : 'Just now'}
                                                        {log.sellerName && <span className="text-slate-600">• by {log.sellerName}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`px-4 py-1.5 ${badge.bg} ${badge.text} text-sm font-bold rounded-lg border ${badge.border} flex items-center gap-2`}>
                                                <span>{badge.icon}</span> {badge.label}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-6">
                                <div className="p-8 bg-white/5 rounded-full border border-white/5">
                                    <History size={64} className="opacity-40" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-slate-400 mb-2">No history found</p>
                                    <p className="text-sm text-slate-600 max-w-xs mx-auto mb-6">You haven't installed any Expanders yet. Visit the store to discover new prompt expanders.</p>
                                    <button
                                        onClick={() => setActiveTab('browse')}
                                        className="px-6 py-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl border border-red-500/20 transition-all font-bold"
                                    >
                                        Browse Store
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Trial Modal */}
            {showTrialModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Gift className="text-blue-400" /> ทดลองใช้งาน
                            </h2>
                            <button
                                onClick={() => setShowTrialModal(null)}
                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                            <h3 className="font-bold text-white mb-2">{showTrialModal.name}</h3>
                            <p className="text-sm text-slate-400 mb-3">{showTrialModal.description}</p>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">ระยะเวลาทดลอง:</span>
                                    <span className="text-blue-400 font-bold">{showTrialModal.trialDays} วัน</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">ค่าทดลอง:</span>
                                    <span className={`font-bold ${showTrialModal.trialFee > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {showTrialModal.trialFee > 0 ? `${showTrialModal.trialFee} TOKEN` : 'ฟรี'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
                            <p className="text-xs text-slate-400">
                                <AlertCircle size={14} className="inline mr-1" />
                                คุณสามารถทดลองใช้งาน Expander นี้ได้ <strong className="text-white">1 ครั้ง</strong> เท่านั้น
                                หลังจากทดลองแล้วจะไม่สามารถทดลองซ้ำได้อีก
                            </p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTrialModal(null)}
                                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => handleStartTrial(showTrialModal)}
                                disabled={isTrialing}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isTrialing ? <Loader2 size={18} className="animate-spin" /> : <Gift size={18} />}
                                เริ่มทดลอง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
