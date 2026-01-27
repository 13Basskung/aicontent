import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-slate-950 text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <Link 
                        to="/"
                        className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>กลับหน้าหลัก</span>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                        นโยบายความเป็นส่วนตัว
                    </h1>
                    <p className="text-slate-400 mb-8">Privacy Policy</p>
                    <p className="text-slate-300 mb-8">อัปเดตล่าสุด: 28 มกราคม 2026</p>

                    <div className="space-y-8 text-slate-300">
                        {/* Section 1 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. ข้อมูลที่เราเก็บรวบรวม</h2>
                            <p className="mb-4">
                                เราเก็บรวบรวมข้อมูลเพื่อให้บริการ Content Auto Post แก่คุณ ข้อมูลที่เก็บรวบรวมประกอบด้วย:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>ข้อมูลบัญชี:</strong> อีเมล, ชื่อผู้ใช้, รหัสผ่าน (เข้ารหัส)</li>
                                <li><strong>ข้อมูลโซเชียลมีเดีย:</strong> Token การเข้าถึง, Channel ID, Page ID จากแพลตฟอร์มที่เชื่อมต่อ (YouTube, Facebook, Instagram, TikTok)</li>
                                <li><strong>ข้อมูลการใช้งาน:</strong> ประวัติการโพสต์, การตั้งเวลา, สถิติการใช้งาน</li>
                                <li><strong>ข้อมูลการชำระเงิน:</strong> ประวัติการสมัครสมาชิก (ไม่เก็บข้อมูลบัตรเครดิต - ดำเนินการผ่าน Stripe)</li>
                            </ul>
                        </section>

                        {/* Section 2 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. วิธีการใช้ข้อมูล</h2>
                            <p className="mb-4">เราใช้ข้อมูลของคุณเพื่อ:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>ให้บริการโพสต์เนื้อหาอัตโนมัติไปยังแพลตฟอร์มโซเชียลมีเดีย</li>
                                <li>จัดการบัญชีและการสมัครสมาชิกของคุณ</li>
                                <li>แสดงสถิติและข้อมูลการใช้งาน</li>
                                <li>ปรับปรุงและพัฒนาบริการของเรา</li>
                                <li>ติดต่อสื่อสารเกี่ยวกับบริการและการอัปเดต</li>
                            </ul>
                        </section>

                        {/* Section 3 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. การแชร์ข้อมูล</h2>
                            <p className="mb-4">
                                เราไม่ขาย แบ่งปัน หรือเปิดเผยข้อมูลส่วนบุคคลของคุณให้กับบุคคลที่สาม ยกเว้น:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>แพลตฟอร์มโซเชียลมีเดีย:</strong> เพื่อดำเนินการโพสต์เนื้อหาตามคำสั่งของคุณ</li>
                                <li><strong>ผู้ให้บริการ:</strong> Firebase (Database), Stripe (Payment), Google Cloud (Hosting)</li>
                                <li><strong>กรณีตามกฎหมาย:</strong> เมื่อมีคำสั่งจากหน่วยงานราชการ</li>
                            </ul>
                        </section>

                        {/* Section 4 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. ความปลอดภัยของข้อมูล</h2>
                            <p className="mb-4">
                                เราใช้มาตรการรักษาความปลอดภัยตามมาตรฐานอุตสาหกรรม:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>การเข้ารหัสข้อมูล (SSL/TLS)</li>
                                <li>การจัดเก็บรหัสผ่านแบบเข้ารหัส (Hashing)</li>
                                <li>การจำกัดการเข้าถึงข้อมูล</li>
                                <li>การสำรองข้อมูลสำรอง (Backup)</li>
                            </ul>
                        </section>

                        {/* Section 5 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. สิทธิของคุณ</h2>
                            <p className="mb-4">คุณมีสิทธิ์:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>เข้าถึงและดาวน์โหลดข้อมูลของคุณ</li>
                                <li>แก้ไขข้อมูลส่วนบุคคล</li>
                                <li>ลบบัญชีและข้อมูลทั้งหมด</li>
                                <li>ยกเลิกการเชื่อมต่อกับแพลตฟอร์มโซเชียลมีเดีย</li>
                                <li>คัดค้านการประมวลผลข้อมูล</li>
                            </ul>
                        </section>

                        {/* Section 6 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">6. คุกกี้ (Cookies)</h2>
                            <p className="mb-4">
                                เราใช้คุกกี้เพื่อ:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>จดจำการเข้าสู่ระบบ</li>
                                <li>วิเคราะห์การใช้งาน (Google Analytics)</li>
                                <li>ปรับปรุงประสบการณ์การใช้งาน</li>
                            </ul>
                            <p className="mt-4">คุณสามารถปิดการใช้งานคุกกี้ได้ในการตั้งค่าเบราว์เซอร์</p>
                        </section>

                        {/* Section 7 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">7. การเปลี่ยนแปลงนโยบาย</h2>
                            <p>
                                เราอาจปรับปรุงนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว การเปลี่ยนแปลงที่สำคัญจะแจ้งให้คุณทราบผ่านอีเมลหรือประกาศบนเว็บไซต์
                            </p>
                        </section>

                        {/* Section 8 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">8. ติดต่อเรา</h2>
                            <p className="mb-4">
                                หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว กรุณาติดต่อ:
                            </p>
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                                <p><strong>อีเมล:</strong> fxfarm.dashboard@gmail.com</p>
                                <p><strong>เว็บไซต์:</strong> https://aicontents.vip</p>
                            </div>
                        </section>

                        {/* English Version */}
                        <div className="border-t border-white/10 pt-8 mt-12">
                            <h1 className="text-3xl font-bold mb-6 text-white">Privacy Policy (English)</h1>
                            
                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">1. Information We Collect</h3>
                                <p className="mb-2">We collect information to provide Content Auto Post services:</p>
                                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                                    <li>Account data: Email, username, encrypted password</li>
                                    <li>Social media data: Access tokens, Channel IDs, Page IDs</li>
                                    <li>Usage data: Post history, scheduling, statistics</li>
                                    <li>Payment data: Subscription history (processed via Stripe)</li>
                                </ul>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h3>
                                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                                    <li>Provide automated content posting services</li>
                                    <li>Manage your account and subscriptions</li>
                                    <li>Display statistics and usage data</li>
                                    <li>Improve and develop our services</li>
                                </ul>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">3. Data Sharing</h3>
                                <p className="text-sm">
                                    We do not sell or share your personal data with third parties, except with social media platforms for posting, service providers (Firebase, Stripe, Google Cloud), and when required by law.
                                </p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">4. Contact Us</h3>
                                <p className="text-sm">Email: fxfarm.dashboard@gmail.com</p>
                                <p className="text-sm">Website: https://aicontents.vip</p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
