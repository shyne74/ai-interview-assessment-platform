const mongoose = require('mongoose')

const connectdb = async function(){
    try{
        const conn = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`'database connected successfully':${conn.MONGODB_URI}`)
    }
    catch(error){
        console.log(`Error:${error.message}`)
        process.exit(1)
    }
}

module.exports = connectdb;
