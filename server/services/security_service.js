const crypto = require("crypto");
const LoginAttempt = require("../models/login_attempt_schema");

// Character sets excluding ambiguous characters (0, O, l, 1, I, o)
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*()_+-=";
const ALL_SAFE = UPPER + LOWER + DIGITS + SYMBOLS;

/**
 * Generates a cryptographically secure temporary password (at least 12 chars).
 */
function generateSecureTempPassword(length = 14) {
    const effectiveLength = Math.max(12, length);
    const chars = [
        UPPER[crypto.randomInt(0, UPPER.length)],
        LOWER[crypto.randomInt(0, LOWER.length)],
        DIGITS[crypto.randomInt(0, DIGITS.length)],
        SYMBOLS[crypto.randomInt(0, SYMBOLS.length)]
    ];

    while (chars.length < effectiveLength) {
        chars.push(ALL_SAFE[crypto.randomInt(0, ALL_SAFE.length)]);
    }

    // Shuffle characters securely (Fisher-Yates)
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join("");
}

/**
 * Validates password strength for candidate password change.
 */
function validatePasswordStrength(password) {
    if (!password || typeof password !== "string") {
        return { valid: false, message: "Password is required." };
    }
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters long." };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Password must include at least one uppercase letter." };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Password must include at least one lowercase letter." };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: "Password must include at least one number." };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        return { valid: false, message: "Password must include at least one special symbol." };
    }
    return { valid: true };
}

// In-memory fallback tracking in case DB is unreachable
const memoryLoginAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getIdentifierKey(email = "", ip = "") {
    return `${(email || "").toLowerCase().trim()}_${(ip || "127.0.0.1").trim()}`;
}

/**
 * Checks if user/ip is locked out due to >= 5 failed attempts in 15 mins.
 */
async function checkLoginLockout(email, ip = "") {
    const key = getIdentifierKey(email, ip);
    const now = Date.now();

    try {
        const record = await LoginAttempt.findOne({ identifier: key });
        if (record && record.lockedUntil && record.lockedUntil.getTime() > now) {
            const remainingMinutes = Math.max(1, Math.ceil((record.lockedUntil.getTime() - now) / 60000));
            return {
                locked: true,
                remainingMinutes,
                message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
            };
        }
    } catch (err) {
        console.warn("[SecurityService] DB lockout check fallback to memory:", err.message);
    }

    // In-memory fallback
    const mem = memoryLoginAttempts.get(key);
    if (mem && mem.lockedUntil && mem.lockedUntil > now) {
        const remainingMinutes = Math.max(1, Math.ceil((mem.lockedUntil - now) / 60000));
        return {
            locked: true,
            remainingMinutes,
            message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
        };
    }

    return { locked: false, remainingMinutes: 0 };
}

/**
 * Records a failed login attempt. Returns current attempt status.
 */
async function recordFailedLogin(email, ip = "") {
    const key = getIdentifierKey(email, ip);
    const now = new Date();
    const nowMs = now.getTime();
    let currentAttempts = 1;
    let locked = false;

    try {
        let record = await LoginAttempt.findOne({ identifier: key });
        if (!record) {
            record = new LoginAttempt({
                identifier: key,
                attempts: 1,
                firstAttemptAt: now
            });
        } else {
            record.attempts += 1;
            if (record.attempts >= MAX_FAILED_ATTEMPTS) {
                record.lockedUntil = new Date(nowMs + LOCKOUT_WINDOW_MS);
                locked = true;
            }
        }
        currentAttempts = record.attempts;
        await record.save();
    } catch (err) {
        console.warn("[SecurityService] DB recordFailedLogin fallback to memory:", err.message);
    }

    // Also update in-memory
    const mem = memoryLoginAttempts.get(key) || { count: 0, firstAttempt: nowMs, lockedUntil: null };
    mem.count += 1;
    if (mem.count >= MAX_FAILED_ATTEMPTS) {
        mem.lockedUntil = nowMs + LOCKOUT_WINDOW_MS;
        locked = true;
    }
    memoryLoginAttempts.set(key, mem);

    return {
        locked: currentAttempts >= MAX_FAILED_ATTEMPTS || locked,
        attempts: currentAttempts,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - currentAttempts)
    };
}

/**
 * Clears failed logins upon successful authentication.
 */
async function clearFailedLogins(email, ip = "") {
    const key = getIdentifierKey(email, ip);
    try {
        await LoginAttempt.deleteMany({ identifier: key });
    } catch (err) {
        console.warn("[SecurityService] DB clearFailedLogins error:", err.message);
    }
    memoryLoginAttempts.delete(key);
}

module.exports = {
    generateSecureTempPassword,
    validatePasswordStrength,
    recordFailedLogin,
    checkLoginLockout,
    clearFailedLogins
};
