const jwt = require("jsonwebtoken")
const User = require("../models/user_schema")

exports.protect = async function(req, res, next) {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1]
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "secretkey123@"
            )
            req.user = await User.findById(decoded.id).select("-password")
            if (!req.user) {
                return res.status(401).json({ message: "user not found" })
            }
            next();
        } catch (error) {
            return res.status(401).json({ message: "not authorized, token invalid" })
        }
    } else {
        return res.status(401).json({ message: "not authorized, no token available" })
    }
}

exports.authorize = function(...role) {
    return function(req, res, next) {
        if (!role.includes(req.user.role)) {
            return res.status(403).json({ message: `user role ${req.user.role} is not authorized to access this route` })
        }
        next();
    }
}