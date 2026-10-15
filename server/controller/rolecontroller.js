const Role = require("../models/role_schema")

exports.createRole = async function(req,res){
    try{
        const{title,description} = req.body

        const role = await Role.create({
            title,
            description
        })
        return res.status(201).json({ message: "role created successfully", role })
    }catch(error){
        return res.status(500).json({message:error.message})
    }

}

exports.getroles = async function(req,res){
try{
    const roles = await Role.find().sort({createdAt:-1})
     return res.status(200).json({
            roles
})
}catch(err){
        return res.status(500).json({
            message:err.message
        })
}
}