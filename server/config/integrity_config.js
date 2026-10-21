// Configuration constants for Exam Integrity and Proctoring
module.exports = {
    // Violation threshold before auto-submitting the exam session
    MAX_INTEGRITY_VIOLATIONS: parseInt(process.env.MAX_INTEGRITY_VIOLATIONS || "2", 10),

    // Heartbeat grace window in seconds (default 45s)
    HEARTBEAT_GRACE_SECONDS: parseInt(process.env.HEARTBEAT_GRACE_SECONDS || "45", 10),

    // Default assessment duration in seconds (default 30 min)
    DEFAULT_DURATION_SECONDS: parseInt(process.env.DEFAULT_DURATION_SECONDS || "1800", 10)
};
