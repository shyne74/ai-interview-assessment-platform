const mongoose = require("mongoose")

const roleSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },

    description:{
        type:String,
        default:""
    }
},{
    timestamps:true
})

module.exports = mongoose.model("Role",roleSchema)