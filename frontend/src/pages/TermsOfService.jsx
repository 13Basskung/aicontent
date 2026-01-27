import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
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
                        เงื่อนไขการให้บริการ
                    </h1>
                    <p className="text-slate-400 mb-8">Terms of Service</p>
                    <p className="text-slate-300 mb-8">อัปเดตล่าสุด: 28 มกราคม 2026</p>

                    <div className="space-y-8 text-slate-300">
                        {/* Section 1 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. การยอมรับเงื่อนไข</h2>
                            <p>
                                การใช้บริการ Content Auto Post ถือว่าคุณยอมรับและตกลงที่จะปฏิบัติตามเงื่อนไขการให้บริการนี้ หากคุณไม่ยอมรับเงื่อนไขเหล่านี้ กรุณาหยุดการใช้บริการทันที
                            </p>
                        </section>

                        {/* Section 2 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. การให้บริการ</h2>
                            <p className="mb-4">
                                Content Auto Post เป็นแพลตฟอร์ม SaaS ที่ให้บริการ:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>การสร้างและจัดการเนื้อหาวิดีโอด้วย AI</li>
                                <li>การโพสต์เนื้อหาอัตโนมัติไปยังแพลตฟอร์มโซเชียลมีเดีย (YouTube, Facebook, Instagram, TikTok)</li>
                                <li>การตั้งเวลาและจัดการตารางการโพสต์</li>
                                <li>การแสดงสถิติและวิเคราะห์ผลลัพธ์</li>
                            </ul>
                        </section>

                        {/* Section 3 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. บัญชีผู้ใช้</h2>
                            <p className="mb-4">คุณมีหน้าที่:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>ให้ข้อมูลที่ถูกต้องและเป็นปัจจุบันในการสมัครสมาชิก</li>
                                <li>รักษาความปลอดภัยของรหัสผ่านและข้อมูลการเข้าสู่ระบบ</li>
                                <li>แจ้งให้เราทราบทันทีหากพบการใช้งานที่ไม่ได้รับอนุญาต</li>
                                <li>รับผิดชอบต่อกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ</li>
                            </ul>
                        </section>

                        {/* Section 4 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. การใช้งานที่ยอมรับได้</h2>
                            <p className="mb-4">คุณตกลงที่จะ:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>ใช้บริการเพื่อวัตถุประสงค์ที่ถูกกฎหมายเท่านั้น</li>
                                <li>ปฏิบัติตามกฎหมายและข้อกำหนดของแพลตฟอร์มโซเชียลมีเดียที่เชื่อมต่อ</li>
                                <li>ไม่โพสต์เนื้อหาที่ผิดกฎหมาย ละเมิดลิขสิทธิ์ หรือเป็นอันตราย</li>
                                <li>ไม่ใช้บริการเพื่อสแปม หรือการกระทำที่เป็นอันตรายอื่นๆ</li>
                            </ul>
                        </section>

                        {/* Section 5 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. การห้ามใช้งาน</h2>
                            <p className="mb-4">คุณห้าม:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>พยายามเข้าถึงระบบโดยไม่ได้รับอนุญาต</li>
                                <li>ทำ Reverse engineer หรือคัดลอกซอฟต์แวร์</li>
                                <li>ใช้บริการเพื่อแข่งขันกับเรา</li>
                                <li>ใช้ Bot หรือเครื่องมืออัตโนมัติที่ไม่ได้รับอนุญาต</li>
                                <li>แชร์บัญชีกับผู้อื่น</li>
                            </ul>
                        </section>

                        {/* Section 6 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">6. ค่าบริการและการชำระเงิน</h2>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>ค่าบริการเรียกเก็บตามแผนที่เลือก (รายเดือน/รายปี)</li>
                                <li>การชำระเงินดำเนินการผ่าน Stripe</li>
                                <li>ค่าบริการไม่สามารถคืนเงินได้ ยกเว้นกรณีที่กฎหมายกำหนด</li>
                                <li>เราสงวนสิทธิ์ในการเปลี่ยนแปลงราคา โดยจะแจ้งให้ทราบล่วงหน้า 30 วัน</li>
                            </ul>
                        </section>

                        {/* Section 7 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">7. การยกเลิกและการระงับบริการ</h2>
                            <p className="mb-4">
                                คุณสามารถยกเลิกการสมัครสมาชิกได้ตลอดเวลา บริการจะสิ้นสุดเมื่อหมดรอบบิลปัจจุบัน
                            </p>
                            <p className="mb-4">
                                เราสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีของคุณหากพบการละเมิดเงื่อนไขการให้บริการ
                            </p>
                        </section>

                        {/* Section 8 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">8. ทรัพย์สินทางปัญญา</h2>
                            <p className="mb-4">
                                เนื้อหาทั้งหมดบนแพลตฟอร์ม (โค้ด, ดีไซน์, โลโก้, ข้อความ) เป็นทรัพย์สินของ Content Auto Post
                            </p>
                            <p>
                                เนื้อหาที่คุณสร้างและอัพโหลดยังคงเป็นของคุณ แต่คุณให้สิทธิ์เราในการประมวลผลเพื่อให้บริการ
                            </p>
                        </section>

                        {/* Section 9 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">9. การจำกัดความรับผิด</h2>
                            <p className="mb-4">
                                เราให้บริการ "ตามสภาพ" (AS IS) โดยไม่มีการรับประกันใดๆ เราไม่รับผิดชอบต่อ:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>ความเสียหายที่เกิดจากการใช้หรือไม่สามารถใช้บริการ</li>
                                <li>การสูญหายของข้อมูล</li>
                                <li>การกระทำของแพลตฟอร์มโซเชียลมีเดียภายนอก</li>
                                <li>ความล่าช้าหรือข้อผิดพลาดในการโพสต์</li>
                            </ul>
                        </section>

                        {/* Section 10 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">10. การเปลี่ยนแปลงเงื่อนไข</h2>
                            <p>
                                เราสงวนสิทธิ์ในการแก้ไขเงื่อนไขการให้บริการนี้ การเปลี่ยนแปลงที่สำคัญจะแจ้งให้คุณทราบผ่านอีเมลหรือประกาศบนเว็บไซต์
                            </p>
                        </section>

                        {/* Section 11 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">11. กฎหมายที่ใช้บังคับ</h2>
                            <p>
                                เงื่อนไขนี้อยู่ภายใต้กฎหมายของประเทศไทย ข้อพิพาทใดๆ จะอยู่ในเขตอำนาจศาลไทย
                            </p>
                        </section>

                        {/* Section 12 */}
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">12. ติดต่อเรา</h2>
                            <p className="mb-4">
                                หากคุณมีคำถามเกี่ยวกับเงื่อนไขการให้บริการ กรุณาติดต่อ:
                            </p>
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                                <p><strong>อีเมล:</strong> fxfarm.dashboard@gmail.com</p>
                                <p><strong>เว็บไซต์:</strong> https://aicontents.vip</p>
                            </div>
                        </section>

                        {/* English Version */}
                        <div className="border-t border-white/10 pt-8 mt-12">
                            <h1 className="text-3xl font-bold mb-6 text-white">Terms of Service (English)</h1>
                            
                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h3>
                                <p className="text-sm">
                                    By using Content Auto Post, you agree to be bound by these Terms of Service. If you do not agree, please stop using the service immediately.
                                </p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">2. Service Description</h3>
                                <p className="text-sm">
                                    Content Auto Post is a SaaS platform providing AI-powered content creation, automated posting to social media platforms, scheduling, and analytics.
                                </p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">3. User Accounts</h3>
                                <p className="text-sm">
                                    You are responsible for maintaining the security of your account, providing accurate information, and all activities under your account.
                                </p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">4. Acceptable Use</h3>
                                <p className="text-sm">
                                    You agree to use the service for lawful purposes only, comply with platform policies, and not post illegal or harmful content.
                                </p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">5. Payment and Fees</h3>
                                <p className="text-sm">
                                    Fees are charged based on your selected plan. Payments are processed via Stripe. Fees are non-refundable except as required by law.
                                </p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">6. Limitation of Liability</h3>
                                <p className="text-sm">
                                    We provide the service "AS IS" without warranties. We are not liable for damages, data loss, or third-party platform actions.
                                </p>
                            </section>

                            <section className="mb-6">
                                <h3 className="text-xl font-bold text-white mb-3">7. Contact Us</h3>
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
