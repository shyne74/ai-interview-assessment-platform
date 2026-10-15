const User = require("../models/user_schema")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const generateToken = function(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET || "secretkey123@", { expiresIn: "30d" })
}

exports.loginuser = async function(req, res) {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "the password or email cannot be empty" })
        }

        const user = await User.findOne({ email })

        const passwordcheck = user && (await bcrypt.compare(password, user.password))

        if (passwordcheck) {
            return res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            })
        } else {
            return res.status(401).json({ message: "invalid user details" })
        }
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.registeruser = async function(req, res) {
    try {
        const { username, password, email, role } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ message: "indicated fields cannot be empty" })
        }

        const userExist = await User.findOne({ email })
        if (userExist) {
            return res.status(400).json({ message: "user already exists in the database" })
        }
        const salt = await bcrypt.genSalt(10)
        const hashedpassword = await bcrypt.hash(password, salt)

        const user = await User.create({
            username,
            email,
            password: hashedpassword,
            role: role || "user"
        })

        if (user) {
            return res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            })
        } else {
            return res.status(400).json({ message: "user could not be created" })
        }
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

exports.getCandidates = async function(req, res) {
    try {
        const candidates = await User.find({
            role: "user",
        }).select("-password")
        return res.status(200).json({ candidates })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}