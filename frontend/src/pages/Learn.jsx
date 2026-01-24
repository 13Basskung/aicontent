import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Download, RefreshCw, Play, Settings, Zap, HelpCircle, ChevronRight, 
  ExternalLink, CheckCircle, AlertCircle, Link2, FolderKanban, Monitor,
  Puzzle, Layers, Cpu, UserCircle, Globe, ShoppingBag, CreditCard,
  Sparkles, Target, Clock, Shield, Wand2, BookOpen, Lightbulb, ArrowRight
} from 'lucide-react';

const EXTENSION_VERSION = "1.0.0";
const EXTENSION_DOWNLOAD_URL = "/downloads/content-auto-post-extension.zip";

// Main Tabs for Learn Page
const mainTabs = [
  { id: 'extension', label: '🧩 Extension', icon: Monitor },
  { id: 'project', label: '📁 Project', icon: FolderKanban },
  { id: 'mode', label: '🎬 Mode', icon: Layers },
  { id: 'extender', label: '⚡ Extender', icon: Zap },
  { id: 'characters', label: '👤 Characters', icon: UserCircle },
  { id: 'platforms', label: '🌐 Platforms', icon: Globe },
  { id: 'marketplace', label: '🛒 Marketplace', icon: ShoppingBag },
  { id: 'payment', label: '💳 Payment', icon: CreditCard },
];

// Tab Sections Content
const tabSections = {
  // ==================== EXTENSION TAB ====================
  extension: [
    {
      id: 'what-is-extension',
      title: '🧩 Extension คืออะไร?',
      icon: Puzzle,
      content: [
        { type: 'heading', text: 'Chrome Extension สำหรับระบบอัตโนมัติ' },
        { type: 'text', text: 'Extension คือโปรแกรมเสริมที่ติดตั้งบน Chrome Browser ทำหน้าที่เป็น "ตัวแทน" ของคุณในการโพสต์คอนเทนต์ไปยังโซเชียลมีเดียต่างๆ โดยอัตโนมัติ' },
        { type: 'subheading', text: 'ทำไมต้องใช้ Extension?' },
        { type: 'bullets', items: [
          'ทำงานอัตโนมัติ 24 ชั่วโมง ตาม Schedule ที่ตั้งไว้',
          'โพสต์วิดีโอไปยัง Facebook, TikTok, Instagram, YouTube พร้อมกัน',
          'ไม่ต้องนั่งโพสต์เอง ประหยัดเวลาหลายชั่วโมงต่อวัน',
          'ปลอดภัย ทำงานบนเครื่องของคุณเอง ไม่ต้องแชร์รหัสผ่าน'
        ]},
        { type: 'tip', text: 'Extension ทำงานบนเครื่องคอมพิวเตอร์ของคุณ ดังนั้นต้องเปิดเครื่องและเปิด Chrome ค้างไว้เพื่อให้ระบบทำงานได้' }
      ]
    },
    {
      id: 'install-extension',
      title: '📥 ติดตั้ง Extension',
      icon: Download,
      content: [
        { type: 'heading', text: 'วิธีติดตั้ง Chrome Extension' },
        { type: 'alert', variant: 'info', text: 'ใช้เวลาไม่เกิน 5 นาที ทำตามขั้นตอนด้านล่างได้เลย' },
        { type: 'steps', items: [
          'กดปุ่ม "ดาวน์โหลด Extension" ด้านล่าง จะได้ไฟล์ .zip',
          'คลิกขวาที่ไฟล์ ZIP แล้วเลือก "Extract All" หรือ "แตกไฟล์ทั้งหมด"',
          'เปิด Chrome พิมพ์ chrome://extensions/ ในช่อง URL แล้วกด Enter',
          'เปิด "Developer mode" (สวิตช์มุมขวาบน)',
          'กดปุ่ม "Load unpacked" แล้วเลือกโฟลเดอร์ที่แตกไว้',
          'จะเห็นไอคอน Extension ปรากฏบนแถบเครื่องมือ Chrome'
        ]},
        { type: 'tip', text: 'คลิกขวาที่ไอคอน Extension แล้วเลือก "Pin" เพื่อให้แสดงบนแถบเครื่องมือตลอดเวลา' },
        { type: 'download', label: 'ดาวน์โหลด Extension', version: EXTENSION_VERSION }
      ]
    },
    {
      id: 'connect-extension',
      title: '🔗 เชื่อมต่อกับระบบ',
      icon: Link2,
      content: [
        { type: 'heading', text: 'เชื่อมต่อ Extension กับบัญชีของคุณ' },
        { type: 'text', text: 'หลังติดตั้งเสร็จ ต้องเชื่อมต่อ Extension กับบัญชีเพื่อรับงานอัตโนมัติ' },
        { type: 'steps', items: [
          'คลิกที่ไอคอน Extension บนแถบเครื่องมือ Chrome',
          'จะเห็นหน้าต่าง Extension ปรากฏขึ้น',
          'ใส่ "Connection Key" ที่ได้รับจาก Admin',
          'กดปุ่ม "Connect" รอสักครู่',
          'เมื่อเชื่อมต่อสำเร็จ สถานะจะเปลี่ยนเป็น "Connected"'
        ]},
        { type: 'alert', variant: 'warning', text: 'หากยังไม่มี Connection Key กรุณาติดต่อ Admin เพื่อขอรับ' },
        { type: 'feature', title: 'Auto Reconnect', description: 'Extension จะพยายามเชื่อมต่อใหม่อัตโนมัติหากขาดการเชื่อมต่อ' }
      ]
    },
    {
      id: 'using-extension',
      title: '📱 การใช้งานประจำวัน',
      icon: Monitor,
      content: [
        { type: 'heading', text: 'ใช้งาน Extension ทุกวัน' },
        { type: 'text', text: 'เมื่อเชื่อมต่อเรียบร้อยแล้ว Extension จะทำงานอัตโนมัติตาม Schedule ที่ Admin ตั้งไว้' },
        { type: 'subheading', text: 'สิ่งที่ต้องทำทุกวัน:' },
        { type: 'steps', items: [
          'เปิดเครื่องคอมพิวเตอร์และเปิด Chrome',
          'ตรวจสอบว่าสถานะ Extension เป็น "Connected"',
          'ปล่อยให้ Extension ทำงานในพื้นหลัง',
          'ระบบจะโพสต์อัตโนมัติเมื่อถึงเวลาที่กำหนด'
        ]},
        { type: 'tip', text: 'ไม่ต้องทำอะไรเพิ่มเติม! แค่เปิด Chrome ค้างไว้ ระบบจะทำงานให้อัตโนมัติ' },
        { type: 'feature', title: 'ดู Jobs Queue', description: 'คลิกแท็บ "Jobs" ใน Extension เพื่อดูงานที่รอดำเนินการ' },
        { type: 'feature', title: 'ดู History', description: 'คลิกแท็บ "History" เพื่อดูประวัติการโพสต์ที่ผ่านมา' }
      ]
    },
    {
      id: 'update-extension',
      title: '🔄 อัปเดต Extension',
      icon: RefreshCw,
      content: [
        { type: 'heading', text: 'อัปเดตเป็นเวอร์ชันล่าสุด' },
        { type: 'alert', variant: 'info', text: 'เมื่อมีเวอร์ชันใหม่ Extension จะแจ้งเตือนให้คุณทราบ' },
        { type: 'steps', items: [
          'ดาวน์โหลดไฟล์ Extension เวอร์ชันใหม่จากปุ่มด้านล่าง',
          'แตกไฟล์ ZIP ไปยังโฟลเดอร์เดิม (Overwrite ไฟล์เก่า)',
          'เปิด Chrome ไปที่ chrome://extensions/',
          'หา "Content Auto Post Agent" แล้วกดปุ่ม 🔄 Reload',
          'เสร็จสิ้น! Extension อัปเดตเรียบร้อย'
        ]},
        { type: 'download', label: 'ดาวน์โหลด Extension ล่าสุด', version: EXTENSION_VERSION }
      ]
    },
    {
      id: 'extension-faq',
      title: '❓ คำถามที่พบบ่อย',
      icon: HelpCircle,
      content: [
        { type: 'heading', text: 'คำถามที่พบบ่อยเกี่ยวกับ Extension' },
        { type: 'faq', items: [
          { q: 'ทำไม Extension ไม่ทำงาน?', a: 'ตรวจสอบว่า 1) สถานะเป็น Connected 2) เปิด Chrome ค้างไว้ 3) มี Jobs ในคิว หากยังไม่ได้ ติดต่อ Admin' },
          { q: 'ต้องเปิด Chrome ตลอดเวลาหรือไม่?', a: 'ใช่ครับ Extension ทำงานบน Chrome ดังนั้นต้องเปิด Chrome ค้างไว้เพื่อให้ระบบโพสต์ได้' },
          { q: 'ปิดเครื่องได้ไหม?', a: 'ได้ครับ แต่งานที่ควรจะโพสต์ในช่วงที่ปิดเครื่อง จะไม่ถูกโพสต์ ระบบจะโพสต์งานค้างเมื่อเปิดเครื่องใหม่' },
          { q: 'ใช้กับ Browser อื่นได้ไหม?', a: 'ขณะนี้รองรับเฉพาะ Google Chrome และ Chromium-based browsers เช่น Edge, Brave' }
        ]}
      ]
    }
  ],

  // ==================== PROJECT TAB ====================
  project: [
    {
      id: 'what-is-project',
      title: '📁 Project คืออะไร?',
      icon: FolderKanban,
      content: [
        { type: 'heading', text: 'ศูนย์กลางการจัดการคอนเทนต์' },
        { type: 'text', text: 'Project คือ "พื้นที่ทำงาน" หลักของคุณ เปรียบเสมือนโฟลเดอร์ที่รวมทุกอย่างไว้ในที่เดียว ได้แก่ Schedule การโพสต์, Platforms ที่จะโพสต์, และ Mode ที่ใช้สร้างคอนเทนต์' },
        { type: 'subheading', text: 'องค์ประกอบหลักของ Project:' },
        { type: 'bullets', items: [
          'TimeSlot Picker - กำหนดเวลาโพสต์ในแต่ละวัน',
          'Platform Selector - เลือกแพลตฟอร์มที่ต้องการโพสต์',
          'Mode & Extender - เลือกรูปแบบและสไตล์คอนเทนต์',
          'Job Queue - ดูคิวงานที่รอดำเนินการ',
          'History - ดูประวัติการโพสต์ที่ผ่านมา'
        ]},
        { type: 'tip', text: 'คุณสามารถมีหลาย Project สำหรับแต่ละช่องทางหรือแต่ละประเภทคอนเทนต์' }
      ]
    },
    {
      id: 'create-project',
      title: '➕ สร้าง Project ใหม่',
      icon: FolderKanban,
      content: [
        { type: 'heading', text: 'วิธีสร้าง Project ใหม่' },
        { type: 'steps', items: [
          'ไปที่หน้า "Projects" จากเมนูด้านซ้าย',
          'กดปุ่ม "+ สร้าง Project ใหม่"',
          'ตั้งชื่อ Project ที่จำง่าย เช่น "ช่อง TikTok หลัก"',
          'เลือก Timezone ที่ถูกต้อง (Asia/Bangkok สำหรับประเทศไทย)',
          'กด "สร้าง" เพื่อบันทึก'
        ]},
        { type: 'alert', variant: 'info', text: 'จำนวน Project ที่สร้างได้ขึ้นอยู่กับแพ็กเกจที่สมัคร' }
      ]
    },
    {
      id: 'timeslot-picker',
      title: '⏰ ตั้งเวลาโพสต์ (TimeSlot)',
      icon: Clock,
      content: [
        { type: 'heading', text: 'กำหนด Schedule การโพสต์' },
        { type: 'text', text: 'TimeSlot Picker ช่วยให้คุณกำหนดเวลาโพสต์ในแต่ละวันของสัปดาห์ ระบบจะสร้าง Jobs อัตโนมัติตาม Schedule ที่ตั้งไว้' },
        { type: 'subheading', text: 'วิธีตั้ง TimeSlot:' },
        { type: 'steps', items: [
          'เปิด Project ที่ต้องการตั้งค่า',
          'ดูตาราง TimeSlot (แนวนอน = วัน, แนวตั้ง = ชั่วโมง)',
          'คลิกที่ช่องเวลาเพื่อเปิด/ปิดการโพสต์',
          'ช่องสีเขียว = จะโพสต์, ช่องว่าง = ไม่โพสต์',
          'ระบบจะสร้าง Job อัตโนมัติตามที่ตั้งไว้'
        ]},
        { type: 'tip', text: 'แนะนำให้โพสต์ช่วง 12:00-13:00 และ 18:00-21:00 เพราะคนออนไลน์เยอะ' },
        { type: 'feature', title: 'Copy Schedule', description: 'สามารถ Copy Schedule จากวันหนึ่งไปใช้กับวันอื่นได้' }
      ]
    },
    {
      id: 'project-platforms',
      title: '🌐 เลือก Platforms',
      icon: Globe,
      content: [
        { type: 'heading', text: 'เชื่อมต่อแพลตฟอร์มโซเชียลมีเดีย' },
        { type: 'text', text: 'ใน Project คุณสามารถเลือกว่าจะโพสต์ไปยังแพลตฟอร์มไหนบ้าง แต่ต้องเชื่อมต่อบัญชีก่อน' },
        { type: 'bullets', items: [
          'Facebook - โพสต์วิดีโอไปหน้าเพจหรือโปรไฟล์',
          'TikTok - อัปโหลดวิดีโอพร้อม Caption',
          'Instagram - โพสต์ Reels หรือ Stories',
          'YouTube - อัปโหลด Shorts หรือวิดีโอปกติ'
        ]},
        { type: 'alert', variant: 'warning', text: 'ต้องเชื่อมต่อบัญชีในหน้า "Platforms" ก่อนจึงจะเลือกใน Project ได้' }
      ]
    },
    {
      id: 'project-mode',
      title: '🎬 เลือก Mode & Extender',
      icon: Layers,
      content: [
        { type: 'heading', text: 'กำหนดรูปแบบคอนเทนต์' },
        { type: 'text', text: 'แต่ละ Project ต้องเลือก Mode และ Extender เพื่อกำหนดว่า AI จะสร้างคอนเทนต์แบบไหน' },
        { type: 'subheading', text: 'การเลือก Mode:' },
        { type: 'bullets', items: [
          'Mode กำหนด "เนื้อหา" และ "โครงสร้าง" ของวิดีโอ',
          'เช่น Mode "คำคมให้กำลังใจ" จะสร้างวิดีโอที่มีคำคม',
          'แต่ละ Mode มีหลาย Blocks ที่กำหนดลำดับเนื้อหา'
        ]},
        { type: 'subheading', text: 'การเลือก Extender:' },
        { type: 'bullets', items: [
          'Extender เพิ่ม "สไตล์" ให้กับคอนเทนต์',
          'เช่น ภาษา, สีโทน, อารมณ์, มุมกล้อง',
          'สามารถเลือกหลาย Extender พร้อมกันได้'
        ]},
        { type: 'tip', text: 'ลองเปลี่ยน Mode และ Extender เพื่อดูผลลัพธ์ที่หลากหลาย' }
      ]
    }
  ],

  // ==================== MODE TAB ====================
  mode: [
    {
      id: 'what-is-mode',
      title: '🎬 Mode คืออะไร?',
      icon: Layers,
      content: [
        { type: 'heading', text: 'สูตรสำเร็จสำหรับสร้างคอนเทนต์' },
        { type: 'text', text: 'Mode คือ "พิมพ์เขียว" หรือ "สูตร" ที่บอก AI ว่าจะสร้างคอนเทนต์อย่างไร ประกอบด้วยคำสั่ง, โครงสร้าง, และตัวละครที่จะใช้' },
        { type: 'subheading', text: 'องค์ประกอบของ Mode:' },
        { type: 'bullets', items: [
          'System Instructions - คำสั่งหลักให้ AI',
          'Story Overview - เรื่องย่อหรือธีมหลัก',
          'Characters - ตัวละครที่จะปรากฏในคอนเทนต์',
          'Blocks - ลำดับขั้นตอนการสร้างคอนเทนต์'
        ]},
        { type: 'feature', title: 'AI ช่วยสร้าง', description: 'AI จะอ่าน Mode แล้วสร้างคอนเทนต์ตามสูตรที่กำหนดโดยอัตโนมัติ' }
      ]
    },
    {
      id: 'create-mode',
      title: '➕ สร้าง Mode ใหม่',
      icon: Wand2,
      content: [
        { type: 'heading', text: 'วิธีสร้าง Mode ของตัวเอง' },
        { type: 'steps', items: [
          'ไปที่หน้า "Mode Creator" จากเมนู',
          'กดปุ่ม "+ สร้าง Mode ใหม่"',
          'ตั้งชื่อและเลือกหมวดหมู่',
          'เขียน System Instructions (คำสั่งให้ AI)',
          'เพิ่ม Blocks สำหรับแต่ละขั้นตอน',
          'เพิ่มตัวละคร (ถ้าต้องการ)',
          'กด "บันทึก" เพื่อเสร็จสิ้น'
        ]},
        { type: 'tip', text: 'เริ่มจาก Mode ตัวอย่างแล้วแก้ไขจะง่ายกว่าสร้างใหม่ทั้งหมด' }
      ]
    },
    {
      id: 'mode-blocks',
      title: '🧱 Blocks คืออะไร?',
      icon: Puzzle,
      content: [
        { type: 'heading', text: 'หน่วยย่อยของ Mode' },
        { type: 'text', text: 'Block คือ "ขั้นตอน" แต่ละขั้นในการสร้างคอนเทนต์ AI จะทำงานทีละ Block ตามลำดับที่กำหนด' },
        { type: 'subheading', text: 'ตัวอย่าง Blocks:' },
        { type: 'bullets', items: [
          'Block 1: "สร้าง Hook เปิดเรื่อง"',
          'Block 2: "เล่าเนื้อหาหลัก"',
          'Block 3: "สรุปและ Call-to-Action"'
        ]},
        { type: 'text', text: 'แต่ละ Block มี Instructions ที่บอก AI ว่าต้องทำอะไร และมี Evolution Steps ที่กำหนดว่าเนื้อหาจะพัฒนาไปอย่างไรในแต่ละรอบ' },
        { type: 'feature', title: 'Evolution Steps', description: 'ทำให้คอนเทนต์ไม่ซ้ำกัน แม้ใช้ Mode เดียวกัน' }
      ]
    },
    {
      id: 'mode-characters',
      title: '👥 ใช้ตัวละครใน Mode',
      icon: UserCircle,
      content: [
        { type: 'heading', text: 'เพิ่มตัวละครให้คอนเทนต์มีชีวิต' },
        { type: 'text', text: 'คุณสามารถเพิ่มตัวละครจาก Character Library เข้ามาใน Mode ได้ AI จะใช้ข้อมูลตัวละครในการสร้างคอนเทนต์' },
        { type: 'subheading', text: 'ประโยชน์ของการใช้ตัวละคร:' },
        { type: 'bullets', items: [
          'คอนเทนต์มีความสม่ำเสมอในเรื่องบุคลิก',
          'ผู้ชมจดจำและผูกพันกับตัวละครได้',
          'AI รู้จักลักษณะ, น้ำเสียง, และท่าทางของตัวละคร'
        ]},
        { type: 'tip', text: 'สร้างตัวละครในหน้า "Characters" ก่อน แล้วค่อยเพิ่มเข้า Mode' }
      ]
    }
  ],

  // ==================== EXTENDER TAB ====================
  extender: [
    {
      id: 'what-is-extender',
      title: '⚡ Extender คืออะไร?',
      icon: Zap,
      content: [
        { type: 'heading', text: 'เครื่องมือเพิ่มสไตล์ให้คอนเทนต์' },
        { type: 'text', text: 'Extender คือชุดคำสั่งพิเศษที่เพิ่ม "สไตล์" หรือ "รายละเอียด" ให้กับคอนเทนต์ ช่วยให้ AI สร้างงานตามสไตล์ที่คุณต้องการ' },
        { type: 'subheading', text: 'หมวดหมู่ของ Extender:' },
        { type: 'bullets', items: [
          '🌍 Language - ภาษาที่ใช้ (ไทย, อังกฤษ, จีน ฯลฯ)',
          '🎨 Visual Style - สไตล์ภาพ (Anime, Realistic, Cartoon)',
          '😊 Mood - อารมณ์ (สนุก, เศร้า, ตื่นเต้น)',
          '💡 Lighting - แสงสี (Warm, Cool, Dramatic)',
          '🎵 Audio - เสียงและดนตรี',
          '📹 Camera - มุมกล้องและการเคลื่อนไหว'
        ]},
        { type: 'tip', text: 'ใช้หลาย Extender รวมกันเพื่อสร้างสไตล์เฉพาะตัว' }
      ]
    },
    {
      id: 'create-extender',
      title: '➕ สร้าง Extender',
      icon: Wand2,
      content: [
        { type: 'heading', text: 'สร้าง Extender ของตัวเอง' },
        { type: 'steps', items: [
          'ไปที่หน้า "Extender Creator"',
          'กดปุ่ม "+ สร้าง Extender ใหม่"',
          'ตั้งชื่อและเลือกหมวดหมู่',
          'เลือก Blocks ที่ต้องการจากแต่ละกลุ่ม',
          'หรือสร้าง Custom Block ของตัวเอง',
          'กด "บันทึก" เพื่อเสร็จสิ้น'
        ]},
        { type: 'feature', title: 'Default Groups', description: 'มี Block สำเร็จรูปให้เลือกมากมายในแต่ละหมวด' }
      ]
    },
    {
      id: 'use-extender',
      title: '🔌 ใช้งาน Extender',
      icon: Zap,
      content: [
        { type: 'heading', text: 'วิธีใช้ Extender ใน Project' },
        { type: 'text', text: 'หลังสร้าง Extender แล้ว คุณสามารถเลือกใช้ใน Project เพื่อปรับแต่งคอนเทนต์' },
        { type: 'steps', items: [
          'เปิด Project ที่ต้องการใช้งาน',
          'ไปที่ส่วน "Extenders"',
          'เลือก Extender ที่ต้องการ (เลือกได้หลายตัว)',
          'Extender จะถูกนำไปใช้กับทุก Job ใน Project นี้'
        ]},
        { type: 'alert', variant: 'info', text: 'คำสั่งจาก Extender จะถูกรวมเข้ากับ Mode เพื่อให้ AI สร้างคอนเทนต์ที่มีสไตล์ครบถ้วน' }
      ]
    }
  ],

  // ==================== CHARACTERS TAB ====================
  characters: [
    {
      id: 'what-is-character',
      title: '👤 Character คืออะไร?',
      icon: UserCircle,
      content: [
        { type: 'heading', text: 'ห้องสมุดตัวละครของคุณ' },
        { type: 'text', text: 'Character คือ "ตัวละคร" ที่คุณสร้างขึ้นเพื่อใช้ในคอนเทนต์ AI จะรู้จักลักษณะ บุคลิก และน้ำเสียงของตัวละครแต่ละตัว' },
        { type: 'subheading', text: 'ข้อมูลตัวละครประกอบด้วย:' },
        { type: 'bullets', items: [
          'ชื่อและรูปภาพ',
          'เพศ และบทบาท (พระเอก, ผู้ร้าย, ตัวประกอบ)',
          'บุคลิกภาพ (ร่าเริง, เงียบขรึม, มั่นใจ)',
          'สไตล์เสียง (นุ่มนวล, กระตือรือร้น, ลึกลับ)',
          'รายละเอียดรูปร่าง (สีผิว, สีตา, ทรงผม)'
        ]},
        { type: 'feature', title: 'Reusable', description: 'สร้างครั้งเดียว ใช้ได้ในหลาย Mode' }
      ]
    },
    {
      id: 'create-character',
      title: '➕ สร้างตัวละคร',
      icon: UserCircle,
      content: [
        { type: 'heading', text: 'วิธีสร้างตัวละครใหม่' },
        { type: 'steps', items: [
          'ไปที่หน้า "Characters"',
          'กดปุ่ม "+ สร้างตัวละครใหม่"',
          'กรอกชื่อและอัปโหลดรูป (ถ้ามี)',
          'เลือกเพศและบทบาท',
          'เลือกบุคลิกภาพและสไตล์เสียง',
          'กรอกรายละเอียดรูปร่าง',
          'เพิ่มคำอธิบายพิเศษ (ถ้าต้องการ)',
          'กด "บันทึก"'
        ]},
        { type: 'tip', text: 'ยิ่งกรอกรายละเอียดมาก AI ยิ่งสร้างคอนเทนต์ได้ตรงความต้องการ' }
      ]
    },
    {
      id: 'use-character',
      title: '🎭 ใช้ตัวละครใน Mode',
      icon: Layers,
      content: [
        { type: 'heading', text: 'เพิ่มตัวละครเข้า Mode' },
        { type: 'text', text: 'หลังสร้างตัวละครแล้ว คุณสามารถเพิ่มเข้า Mode เพื่อให้ AI ใช้ในการสร้างคอนเทนต์' },
        { type: 'steps', items: [
          'เปิด Mode ที่ต้องการแก้ไข',
          'ไปที่ส่วน "Characters"',
          'กด "เพิ่มตัวละคร"',
          'เลือกตัวละครจากรายการ',
          'กำหนดบทบาทในเรื่อง',
          'กด "บันทึก"'
        ]},
        { type: 'alert', variant: 'info', text: 'ตัวละครหนึ่งตัวสามารถใช้ได้ในหลาย Mode' }
      ]
    }
  ],

  // ==================== PLATFORMS TAB ====================
  platforms: [
    {
      id: 'what-is-platform',
      title: '🌐 Platform คืออะไร?',
      icon: Globe,
      content: [
        { type: 'heading', text: 'เชื่อมต่อโซเชียลมีเดียของคุณ' },
        { type: 'text', text: 'Platform คือการเชื่อมต่อบัญชีโซเชียลมีเดียเข้ากับระบบ เพื่อให้ Extension สามารถโพสต์คอนเทนต์ได้อัตโนมัติ' },
        { type: 'subheading', text: 'แพลตฟอร์มที่รองรับ:' },
        { type: 'bullets', items: [
          '📘 Facebook - เพจและโปรไฟล์',
          '🎵 TikTok - บัญชี TikTok',
          '📸 Instagram - Reels และ Stories',
          '🎬 YouTube - Shorts และวิดีโอ'
        ]},
        { type: 'feature', title: 'Multi-Account', description: 'สามารถเชื่อมต่อหลายบัญชีต่อแพลตฟอร์มได้' }
      ]
    },
    {
      id: 'connect-platform',
      title: '🔗 เชื่อมต่อบัญชี',
      icon: Link2,
      content: [
        { type: 'heading', text: 'วิธีเชื่อมต่อบัญชีโซเชียลมีเดีย' },
        { type: 'text', text: 'การเชื่อมต่อทำผ่าน Extension โดย Login เข้าบัญชีจริงบน Browser' },
        { type: 'steps', items: [
          'ไปที่หน้า "Platforms"',
          'เลือกแพลตฟอร์มที่ต้องการเชื่อมต่อ',
          'กด "+ เพิ่มบัญชี"',
          'Extension จะเปิดหน้า Login ของแพลตฟอร์มนั้น',
          'Login ด้วยบัญชีจริงของคุณ',
          'รอระบบยืนยันการเชื่อมต่อ',
          'เมื่อสำเร็จ บัญชีจะปรากฏในรายการ'
        ]},
        { type: 'alert', variant: 'warning', text: 'ต้องเปิด Extension ขณะเชื่อมต่อบัญชี' },
        { type: 'tip', text: 'ระบบไม่เก็บรหัสผ่าน ใช้ Cookie ของ Browser ในการทำงาน' }
      ]
    },
    {
      id: 'manage-platform',
      title: '⚙️ จัดการบัญชี',
      icon: Settings,
      content: [
        { type: 'heading', text: 'จัดการบัญชีที่เชื่อมต่อแล้ว' },
        { type: 'text', text: 'คุณสามารถเปลี่ยนชื่อ, ดูสถานะ, หรือลบบัญชีได้ตลอดเวลา' },
        { type: 'subheading', text: 'สิ่งที่ทำได้:' },
        { type: 'bullets', items: [
          'เปลี่ยนชื่อบัญชี (Alias) เพื่อจำง่าย',
          'ดูสถานะการเชื่อมต่อ',
          'ลบบัญชีที่ไม่ใช้แล้ว',
          'เชื่อมต่อใหม่หาก Cookie หมดอายุ'
        ]},
        { type: 'alert', variant: 'info', text: 'หาก Cookie หมดอายุ ระบบจะแจ้งให้ Login ใหม่' }
      ]
    }
  ],

  // ==================== MARKETPLACE TAB ====================
  marketplace: [
    {
      id: 'what-is-marketplace',
      title: '🛒 Marketplace คืออะไร?',
      icon: ShoppingBag,
      content: [
        { type: 'heading', text: 'ตลาดซื้อขาย Extenders' },
        { type: 'text', text: 'Marketplace คือตลาดกลางที่ผู้ใช้สามารถซื้อหรือขาย Extenders ที่สร้างขึ้น ช่วยให้คุณได้ Extender คุณภาพโดยไม่ต้องสร้างเอง' },
        { type: 'subheading', text: 'ประโยชน์:' },
        { type: 'bullets', items: [
          'ซื้อ Extender จากผู้เชี่ยวชาญ ประหยัดเวลา',
          'ทดลองใช้ฟรีก่อนซื้อ (Trial)',
          'ขาย Extender ของตัวเอง สร้างรายได้',
          'ให้คะแนนและรีวิว Extenders'
        ]},
        { type: 'feature', title: 'Creator Economy', description: 'สร้างรายได้จากความคิดสร้างสรรค์ของคุณ' }
      ]
    },
    {
      id: 'buy-extender',
      title: '🛍️ ซื้อ Extender',
      icon: ShoppingBag,
      content: [
        { type: 'heading', text: 'วิธีซื้อ Extender จาก Marketplace' },
        { type: 'steps', items: [
          'ไปที่หน้า "Marketplace"',
          'เลือกหมวดหมู่หรือค้นหา Extender ที่ต้องการ',
          'คลิกดูรายละเอียดและรีวิว',
          'กด "ทดลองใช้ฟรี" เพื่อลองก่อน (ถ้ามี)',
          'หากพอใจ กด "ซื้อ"',
          'ยืนยันการชำระเงินจาก Wallet',
          'Extender จะถูกเพิ่มเข้าคลังของคุณ'
        ]},
        { type: 'alert', variant: 'info', text: 'ต้องมีเงินใน Wallet ก่อนซื้อ ไปเติมเงินได้ที่หน้า "Payments"' }
      ]
    },
    {
      id: 'sell-extender',
      title: '💰 ขาย Extender',
      icon: CreditCard,
      content: [
        { type: 'heading', text: 'วิธีขาย Extender ใน Marketplace' },
        { type: 'steps', items: [
          'สร้าง Extender ที่มีคุณภาพในหน้า Extender Creator',
          'ไปที่หน้า "Marketplace"',
          'กด "ลงขาย Extender"',
          'เลือก Extender ที่ต้องการขาย',
          'ตั้งราคาและเขียนคำอธิบาย',
          'กำหนดว่าให้ทดลองฟรีได้หรือไม่',
          'กด "ลงขาย"',
          'รอผู้ซื้อและรับเงินเข้า Wallet'
        ]},
        { type: 'tip', text: 'Extender ที่มีรีวิวดีจะขายดีกว่า ดูแลคุณภาพให้ดี!' }
      ]
    }
  ],

  // ==================== PAYMENT TAB ====================
  payment: [
    {
      id: 'wallet-system',
      title: '💳 ระบบ Wallet',
      icon: CreditCard,
      content: [
        { type: 'heading', text: 'กระเป๋าเงินในระบบ' },
        { type: 'text', text: 'Wallet คือกระเป๋าเงินดิจิทัลในระบบ ใช้สำหรับซื้อ Extenders, จ่ายค่าบริการ, และรับเงินจากการขาย' },
        { type: 'subheading', text: 'สิ่งที่ทำได้กับ Wallet:' },
        { type: 'bullets', items: [
          '💰 ดูยอดเงินคงเหลือ',
          '➕ เติมเงินผ่าน PromptPay',
          '➖ ถอนเงินเข้าบัญชีธนาคาร',
          '📊 ดูประวัติธุรกรรม'
        ]},
        { type: 'feature', title: 'Real-time Balance', description: 'ยอดเงินอัปเดตทันทีหลังทำธุรกรรม' }
      ]
    },
    {
      id: 'deposit-money',
      title: '➕ เติมเงิน',
      icon: CreditCard,
      content: [
        { type: 'heading', text: 'วิธีเติมเงินเข้า Wallet' },
        { type: 'steps', items: [
          'ไปที่หน้า "Payments"',
          'กด "เติมเงิน"',
          'ใส่จำนวนเงินที่ต้องการเติม',
          'ระบบจะแสดง QR Code PromptPay',
          'สแกน QR Code ด้วยแอปธนาคาร',
          'ชำระเงินตามจำนวน',
          'รอสักครู่ ระบบจะเติมเงินอัตโนมัติ'
        ]},
        { type: 'alert', variant: 'info', text: 'ระบบตรวจสอบการชำระเงินอัตโนมัติ ใช้เวลาไม่เกิน 5 นาที' }
      ]
    },
    {
      id: 'withdraw-money',
      title: '➖ ถอนเงิน',
      icon: CreditCard,
      content: [
        { type: 'heading', text: 'วิธีถอนเงินจาก Wallet' },
        { type: 'steps', items: [
          'ไปที่หน้า "Payments"',
          'กด "ถอนเงิน"',
          'เลือกบัญชีธนาคารปลายทาง (หรือเพิ่มบัญชีใหม่)',
          'ใส่จำนวนเงินที่ต้องการถอน',
          'ยืนยันการถอน',
          'รอรับเงินใน 1-3 วันทำการ'
        ]},
        { type: 'alert', variant: 'warning', text: 'ถอนขั้นต่ำ 100 บาท และมีค่าธรรมเนียมตามที่กำหนด' }
      ]
    },
    {
      id: 'subscription',
      title: '📋 Subscription',
      icon: Shield,
      content: [
        { type: 'heading', text: 'แพ็กเกจการใช้งาน' },
        { type: 'text', text: 'ระบบมีหลายแพ็กเกจให้เลือกใช้ แต่ละแพ็กเกจมีจำนวน Projects, Modes, และ Extenders ที่ใช้ได้แตกต่างกัน' },
        { type: 'subheading', text: 'แพ็กเกจที่มี:' },
        { type: 'bullets', items: [
          '🆓 Free Trial - ทดลองใช้ฟรี จำกัดจำนวน',
          '🥉 Basic - เหมาะสำหรับผู้เริ่มต้น',
          '🥈 Pro - สำหรับผู้ใช้งานจริงจัง',
          '🥇 Business - สำหรับธุรกิจหรือทีม'
        ]},
        { type: 'tip', text: 'อัปเกรดแพ็กเกจได้ตลอดเวลา ระบบคิดค่าบริการตามสัดส่วน (Prorate)' }
      ]
    },
    {
      id: 'extra-resources',
      title: '➕ ซื้อ Resource เพิ่ม',
      icon: Zap,
      content: [
        { type: 'heading', text: 'เพิ่ม Projects, Modes, หรือ Extenders' },
        { type: 'text', text: 'หากต้องการใช้งานมากกว่าที่แพ็กเกจกำหนด สามารถซื้อเพิ่มได้โดยไม่ต้องอัปเกรดแพ็กเกจ' },
        { type: 'steps', items: [
          'ไปที่หน้า "Payments" > "Subscription"',
          'กด "ซื้อ Resource เพิ่ม"',
          'เลือกประเภท (Project, Mode, หรือ Extender)',
          'ใส่จำนวนที่ต้องการ',
          'ยืนยันการชำระเงินจาก Wallet',
          'Resource จะถูกเพิ่มทันที'
        ]},
        { type: 'alert', variant: 'info', text: 'Resource เพิ่มเติมมีอายุตามรอบ Subscription ปัจจุบัน' }
      ]
    }
  ]
};

export default function Learn() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'extension');
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && mainTabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const sections = tabSections[activeTab];
    if (sections && sections.length > 0) {
      setActiveSection(sections[0].id);
    }
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const renderContent = (content) => {
    return content.map((item, index) => {
      switch (item.type) {
        case 'heading':
          return <h3 key={index} className="text-xl font-bold text-white mb-3">{item.text}</h3>;
        case 'subheading':
          return <h4 key={index} className="text-lg font-semibold text-white/90 mb-2 mt-4">{item.text}</h4>;
        case 'text':
          return <p key={index} className="text-slate-300 mb-4 leading-relaxed">{item.text}</p>;
        case 'steps':
          return (
            <ol key={index} className="list-decimal list-inside space-y-2 mb-4 text-slate-300">
              {item.items.map((step, i) => (
                <li key={i} className="pl-2">{step}</li>
              ))}
            </ol>
          );
        case 'bullets':
          return (
            <ul key={index} className="list-disc list-inside space-y-2 mb-4 text-slate-300">
              {item.items.map((bullet, i) => (
                <li key={i} className="pl-2">{bullet}</li>
              ))}
            </ul>
          );
        case 'download':
          return (
            <a key={index} href={EXTENSION_DOWNLOAD_URL} download
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-500 hover:to-red-600 transition-all shadow-lg hover:shadow-red-500/25">
              <Download className="w-5 h-5" />
              {item.label} (v{item.version})
            </a>
          );
        case 'alert':
          const alertStyles = {
            info: 'bg-blue-500/20 border-blue-500/50 text-blue-200',
            warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200',
            success: 'bg-green-500/20 border-green-500/50 text-green-200',
            error: 'bg-red-500/20 border-red-500/50 text-red-200'
          };
          return (
            <div key={index} className={`p-4 rounded-xl border ${alertStyles[item.variant]} mb-4`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p>{item.text}</p>
              </div>
            </div>
          );
        case 'tip':
          return (
            <div key={index} className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 mb-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p><strong>💡 Tips:</strong> {item.text}</p>
              </div>
            </div>
          );
        case 'feature':
          return (
            <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10 mb-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Sparkles className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h5 className="font-semibold text-white">{item.title}</h5>
                  <p className="text-slate-400 text-sm mt-1">{item.description}</p>
                </div>
              </div>
            </div>
          );
        case 'card':
          return (
            <div key={index} className="p-5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 mb-4">
              <h5 className="font-bold text-white text-lg mb-2">{item.title}</h5>
              <p className="text-slate-300">{item.description}</p>
            </div>
          );
        case 'faq':
          return (
            <div key={index} className="space-y-3 mb-4">
              {item.items.map((faq, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-semibold text-white mb-2">❓ {faq.q}</p>
                  <p className="text-slate-400">{faq.a}</p>
                </div>
              ))}
            </div>
          );
        default:
          return null;
      }
    });
  };

  const currentSections = tabSections[activeTab] || [];
  const currentSection = currentSections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-red-400" />
            ศูนย์การเรียนรู้
          </h1>
          <p className="text-slate-400 mt-2">คู่มือการใช้งานระบบ Content Auto Post แบบครบถ้วน</p>
        </div>

        {/* Main Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 p-2 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-4 sticky top-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                หัวข้อในหมวดนี้
              </h3>
              <div className="space-y-1">
                {currentSections.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                        activeSection === section.id
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{section.title}</span>
                    </button>
                  );
                })}
                {currentSections.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">กำลังโหลดเนื้อหา...</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-6 min-h-[500px]">
              {currentSection ? (
                <div>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                    <div className="p-3 rounded-xl bg-red-500/20">
                      <currentSection.icon className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{currentSection.title}</h2>
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    {renderContent(currentSection.content)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">เลือกหัวข้อเพื่อเริ่มเรียนรู้</h3>
                  <p className="text-slate-500">กรุณาเลือกหัวข้อจากเมนูด้านซ้าย</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
