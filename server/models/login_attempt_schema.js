const mongoose = require("mongoose");

const loginAttemptSchema = new mongoose.Schema({
    identifier: {
        type: String,
        required: true,
        index: true
    },
    attempts: {
        type: Number,
        default: 1
    },
    firstAttemptAt: {
        type: Date,
        default: Date.now
    },
    lockedUntil: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 900 // 15 minutes TTL
    }
});

module.exports = mongoose.model("login_attempt", loginAttemptSchema);
