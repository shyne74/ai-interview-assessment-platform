const mongoose = require("mongoose")

const roleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    description: {
        type: String,
        default: ""
    },

    domains: {
        type: [String],
        default: []
    },

    aliases: {
        type: [String],
        default: []
    },

    status: {
        type: String,
        enum: ["Active", "Draft", "Archived"],
        default: "Active"
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Role", roleSchema)
