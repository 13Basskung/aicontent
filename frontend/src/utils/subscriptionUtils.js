/**
 * Subscription Utility Functions
 * ระบบ Subscription รายเดือน
 */

// ราคาแพ็คเกจ
export const SUBSCRIPTION_PRICES = {
    PRO_PLAN: 199,           // แพลน Pro รายเดือน (ปลดล็อคสถานะ)
    EXTRA_PROJECT: 250,      // เพิ่ม Project ละ 250 บาท/เดือน (Add-on)
};

// Limits พื้นฐานของแพลน 199 (ได้ 1 Project, 2 Mode, 2 Extender)
export const BASE_PLAN_LIMITS = {
    PROJECTS: 1,
    MODES: 2,
    EXTENDERS: 2,
};

// Limits ที่เพิ่มต่อ 1 Project ที่ซื้อเพิ่ม (Add-on)
export const ADDON_LIMITS_PER_PROJECT = {
    MODES: 2,
    EXTENDERS: 2,
};

// Free Trial Limits
export const FREE_TRIAL_LIMITS = {
    PROJECTS: 1,
    MODES: 1,
    EXTENDERS: 1,
    DAYS: 7,
};

// Tier ระดับลูกค้า
export const SUBSCRIPTION_TIERS = {
    FREE: 'Free',
    VIP: 'VIP',           // Subscription ปกติ
    PREMIUM: 'Premium',   // Subscription + เพิ่ม Project
    EXPIRED: 'Expired',   // Subscription หมดอายุ (ไม่ต่ออายุ) - Limit = 0
};

// Expired Limits (เมื่อ Subscription หมดอายุและไม่ต่ออายุ)
export const EXPIRED_LIMITS = {
    PROJECTS: 0,
    MODES: 0,
    EXTENDERS: 0,
};

/**
 * คำนวณ Limits ตามจำนวน Projects
 * - แพลน 199 ได้: 1 Project, 1 Mode, 1 Extender
 * - ซื้อเพิ่ม Project ละ 250: +1 Project, +2 Modes, +2 Extenders
 * @param {number} extraProjects - จำนวน Projects ที่ซื้อเพิ่ม (0 = แพลน 199 อย่างเดียว)
 * @returns {{ projects: number, modes: number, extenders: number }}
 */
export const calculateLimits = (extraProjects = 0) => {
    const extra = Math.max(0, extraProjects);
    return {
        projects: BASE_PLAN_LIMITS.PROJECTS + extra,
        modes: BASE_PLAN_LIMITS.MODES + (extra * ADDON_LIMITS_PER_PROJECT.MODES),
        extenders: BASE_PLAN_LIMITS.EXTENDERS + (extra * ADDON_LIMITS_PER_PROJECT.EXTENDERS),
    };
};

/**
 * คำนวณราคา Prorate ตามวันที่เหลือในเดือน
 * @param {number} fullPrice - ราคาเต็มต่อเดือน
 * @param {Date} purchaseDate - วันที่ซื้อ
 * @returns {{ proratedPrice: number, daysRemaining: number, endOfMonth: Date }}
 */
export const calculateProrate = (fullPrice, purchaseDate = new Date()) => {
    const year = purchaseDate.getFullYear();
    const month = purchaseDate.getMonth();
    
    // วันสุดท้ายของเดือน
    const endOfMonth = new Date(year, month + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    // จำนวนวันในเดือน
    const daysInMonth = endOfMonth.getDate();
    
    // วันที่เหลือ (รวมวันนี้)
    const currentDay = purchaseDate.getDate();
    const daysRemaining = daysInMonth - currentDay + 1;
    
    // ราคา Prorate (ปัดขึ้นเป็นจำนวนเต็ม)
    const pricePerDay = fullPrice / daysInMonth;
    const proratedPrice = Math.ceil(pricePerDay * daysRemaining);
    
    return {
        proratedPrice,
        daysRemaining,
        daysInMonth,
        endOfMonth,
        pricePerDay: Math.round(pricePerDay * 100) / 100,
    };
};

/**
 * คำนวณราคารวมสำหรับการสมัคร/ต่ออายุ/ซื้อ Add-on
 * 
 * กติกาหลัก:
 * - ถ้าลูกค้าเป็น Free → ต้องจ่ายค่าแพลน 199 + Add-on (ถ้ามี)
 * - ถ้าลูกค้าเป็น Premium/Pro แล้ว → จ่ายเฉพาะ Add-on (ไม่คิดค่าแพลนซ้ำ)
 * - Limits จะคำนวณจาก totalExtraProjects (รวมของเดิม + ใหม่)
 * 
 * @param {number} newExtraProjects - จำนวน Project ที่ซื้อใหม่ครั้งนี้ (สำหรับคิดเงิน)
 * @param {boolean} isProrate - เป็นการซื้อระหว่างเดือนหรือไม่
 * @param {Date} purchaseDate - วันที่ซื้อ
 * @param {boolean} isAlreadySubscribed - ลูกค้าเป็น Premium/Pro อยู่แล้วหรือไม่ (default: false = Free)
 * @param {number} totalExtraProjects - จำนวน Project รวมทั้งหมด (เดิม + ใหม่) สำหรับคำนวณ Limits
 * @param {string} billingMonth - 'current' = เดือนนี้ (prorate), 'next' = เดือนหน้า (เต็มเดือน)
 * @returns {{ total: number, breakdown: object }}
 */
export const calculateTotalPrice = (newExtraProjects = 0, isProrate = false, purchaseDate = new Date(), isAlreadySubscribed = false, totalExtraProjects = null, billingMonth = 'current') => {
    // ถ้าไม่ได้ส่ง totalExtraProjects มา ให้ใช้ newExtraProjects (กรณี Free user)
    const effectiveTotalExtra = totalExtraProjects !== null ? totalExtraProjects : newExtraProjects;
    
    // ถ้าเป็น Premium/Pro อยู่แล้ว → ไม่คิดค่าแพลนซ้ำ
    let proPlanPrice = isAlreadySubscribed ? 0 : SUBSCRIPTION_PRICES.PRO_PLAN;
    // คิดเงินเฉพาะ Project ที่ซื้อใหม่
    let extraProjectsPrice = newExtraProjects * SUBSCRIPTION_PRICES.EXTRA_PROJECT;
    
    let proPlanProrate = null;
    let extraProjectsProrate = null;
    let expiryDate = null;
    
    // ถ้าเลือก "เดือนหน้า" → ไม่คิด prorate, คิดราคาเต็ม, หมดอายุสิ้นเดือนหน้า
    if (billingMonth === 'next') {
        // ราคาเต็ม (ไม่ prorate)
        proPlanPrice = isAlreadySubscribed ? 0 : SUBSCRIPTION_PRICES.PRO_PLAN;
        extraProjectsPrice = newExtraProjects * SUBSCRIPTION_PRICES.EXTRA_PROJECT;
        
        // คำนวณวันหมดอายุ = สิ้นเดือนหน้า
        const nextMonth = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + 2, 0);
        expiryDate = nextMonth;
    } else if (isProrate) {
        // เดือนนี้ + prorate
        // คำนวณ prorate สำหรับค่าแพลน (เฉพาะถ้าเป็น Free)
        if (!isAlreadySubscribed) {
            proPlanProrate = calculateProrate(SUBSCRIPTION_PRICES.PRO_PLAN, purchaseDate);
            proPlanPrice = proPlanProrate.proratedPrice;
        }
        
        // คำนวณ prorate สำหรับ Add-on (เฉพาะที่ซื้อใหม่)
        if (newExtraProjects > 0) {
            extraProjectsProrate = calculateProrate(SUBSCRIPTION_PRICES.EXTRA_PROJECT * newExtraProjects, purchaseDate);
            extraProjectsPrice = extraProjectsProrate.proratedPrice;
        }
        
        // วันหมดอายุ = สิ้นเดือนนี้
        expiryDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + 1, 0);
    } else {
        // วันที่ 1 ของเดือน = ไม่ prorate
        expiryDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + 1, 0);
    }
    
    const total = proPlanPrice + extraProjectsPrice;
    // คำนวณ Limits จาก totalExtraProjects (รวมของเดิม + ใหม่)
    const limits = calculateLimits(effectiveTotalExtra);
    
    return {
        total,
        breakdown: {
            proPlan: proPlanPrice,
            extraProjects: extraProjectsPrice,
            newExtraProjectsCount: newExtraProjects,
            totalExtraProjectsCount: effectiveTotalExtra,
            isAlreadySubscribed,
        },
        prorate: (isProrate && billingMonth === 'current') ? {
            proPlan: proPlanProrate,
            extraProjects: extraProjectsProrate,
            daysRemaining: proPlanProrate?.daysRemaining || extraProjectsProrate?.daysRemaining,
        } : null,
        limits,
        tier: effectiveTotalExtra > 0 ? SUBSCRIPTION_TIERS.PREMIUM : SUBSCRIPTION_TIERS.VIP,
        billingMonth,
        expiryDate,
    };
};

/**
 * คำนวณวันหมดอายุ (สิ้นเดือน)
 * @param {Date} fromDate - วันที่เริ่มต้น
 * @returns {Date}
 */
export const getExpiryDate = (fromDate = new Date()) => {
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth();
    const endOfMonth = new Date(year, month + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
};

/**
 * คำนวณวันที่ต้องแจ้งบิล (7 วันก่อนสิ้นเดือน)
 * @param {Date} expiryDate - วันหมดอายุ
 * @returns {Date}
 */
export const getBillingNotificationDate = (expiryDate) => {
    const notificationDate = new Date(expiryDate);
    notificationDate.setDate(notificationDate.getDate() - 7);
    return notificationDate;
};

/**
 * ตรวจสอบว่าควร Block การใช้งานหรือไม่
 * @param {Date} expiryDate - วันหมดอายุ
 * @param {string} status - สถานะ subscription
 * @returns {{ shouldBlock: boolean, reason: string, gracePeriodDays: number }}
 */
export const checkShouldBlock = (expiryDate, status) => {
    const now = new Date();
    const today = now.getDate();
    
    // ถ้า status เป็น active และยังไม่หมดอายุ ไม่ต้อง block
    if (status === 'active' && expiryDate > now) {
        return { shouldBlock: false, reason: null, gracePeriodDays: 0 };
    }
    
    // ถ้าหมดอายุแล้ว ตรวจสอบ grace period (วันที่ 1-3)
    if (status === 'expired' || expiryDate < now) {
        // Grace period: วันที่ 1-3 ของเดือน
        if (today >= 1 && today <= 3) {
            return {
                shouldBlock: false,
                reason: 'grace_period',
                gracePeriodDays: 4 - today, // เหลือกี่วันก่อน block
            };
        }
        
        // หลังวันที่ 3 = Block
        return {
            shouldBlock: true,
            reason: 'payment_overdue',
            gracePeriodDays: 0,
        };
    }
    
    return { shouldBlock: false, reason: null, gracePeriodDays: 0 };
};

/**
 * ตรวจสอบว่าอยู่ในช่วง Free Trial หรือไม่
 * @param {Date} trialEndsAt - วันที่ Trial หมด
 * @returns {{ isInTrial: boolean, daysRemaining: number }}
 */
export const checkFreeTrial = (trialEndsAt) => {
    if (!trialEndsAt) return { isInTrial: false, daysRemaining: 0 };
    
    const now = new Date();
    const trialEnd = new Date(trialEndsAt);
    
    if (now > trialEnd) {
        return { isInTrial: false, daysRemaining: 0 };
    }
    
    const diffTime = trialEnd - now;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { isInTrial: true, daysRemaining };
};

/**
 * สร้างข้อมูล Subscription เริ่มต้นสำหรับ User ใหม่ (Free Trial)
 * @param {string} userId 
 * @returns {object}
 */
export const createInitialSubscription = (userId) => {
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + FREE_TRIAL_LIMITS.DAYS);
    
    return {
        userId,
        plan: 'free_trial',
        status: 'active',
        tier: SUBSCRIPTION_TIERS.FREE,
        extraProjects: 0,
        totalProjects: 1,
        limits: {
            projects: FREE_TRIAL_LIMITS.PROJECTS,
            modes: FREE_TRIAL_LIMITS.MODES,
            extenders: FREE_TRIAL_LIMITS.EXTENDERS,
        },
        startDate: now,
        expiryDate: trialEndsAt,
        trialEndsAt: trialEndsAt,
        isTrialUsed: true,
        createdAt: now,
        updatedAt: now,
    };
};

/**
 * สร้างข้อมูล Subscription หลังอนุมัติการชำระเงิน
 * 
 * @param {object} currentSub - Subscription ปัจจุบัน (ถ้ามี)
 * @param {number} totalExtraProjects - จำนวน Extra Projects รวมทั้งหมด (เดิม + ใหม่) จาก payment record
 * @param {Date} approvalDate - วันที่อนุมัติ
 * @param {Date|null} paymentExpiryDate - วันหมดอายุจาก payment record (ถ้าลูกค้าเลือกเดือนหน้า)
 * @returns {object}
 */
export const createApprovedSubscription = (currentSub, totalExtraProjects = 0, approvalDate = new Date(), paymentExpiryDate = null) => {
    const now = approvalDate;
    const totalProjects = 1 + totalExtraProjects;  // Base 1 + total extra
    const limits = calculateLimits(totalExtraProjects);  // คำนวณจาก total extra
    
    // คำนวณวันหมดอายุ
    let expiryDate;
    
    // ถ้ามี expiryDate จาก payment record (กรณีลูกค้าเลือกเดือนหน้า) ให้ใช้ค่านั้น
    if (paymentExpiryDate) {
        expiryDate = new Date(paymentExpiryDate);
        expiryDate.setHours(23, 59, 59, 999);
    } else {
        // ถ้าจ่ายก่อนสิ้นเดือน ให้หมดอายุสิ้นเดือนถัดไป
        const endOfCurrentMonth = getExpiryDate(now);
        const dayOfMonth = now.getDate();
        
        if (dayOfMonth <= 25) {
            // จ่ายก่อนวันที่ 25 → หมดอายุสิ้นเดือนนี้
            expiryDate = endOfCurrentMonth;
        } else {
            // จ่ายหลังวันที่ 25 → หมดอายุสิ้นเดือนถัดไป
            expiryDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
            expiryDate.setHours(23, 59, 59, 999);
        }
    }
    
    return {
        plan: 'pro',
        status: 'active',
        tier: totalExtraProjects > 0 ? SUBSCRIPTION_TIERS.PREMIUM : SUBSCRIPTION_TIERS.VIP,
        extraProjects: totalExtraProjects,  // เก็บ total extra ทั้งหมด
        totalProjects,
        limits,
        startDate: now,
        expiryDate,
        trialEndsAt: currentSub?.trialEndsAt || null,
        isTrialUsed: true,
        updatedAt: now,
        lastPaymentAt: now,
    };
};

/**
 * Format ราคาเป็น Thai Baht
 * @param {number} amount 
 * @returns {string}
 */
export const formatPrice = (amount) => {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format วันที่เป็นภาษาไทย
 * @param {Date} date 
 * @returns {string}
 */
export const formatThaiDate = (date) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};
