const mongoose = require('mongoose')

const UserSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:"user"
    },
    preferredRole: {
        type: String,
        default: "Backend Developer"
    },
    mustChangePassword: {
        type: Boolean,
        default: false
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    batchIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "batch"
    }],
    tempPasswordExpiresAt: {
        type: Date
    },
    proctoringConsentAt: {
        type: Date
    }
},
{
    timestamps: true
})

module.exports = mongoose.model('user',UserSchema)