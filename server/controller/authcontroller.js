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
        }).select("-password").sort({ createdAt: -1 })
        return res.status(200).json({ candidates })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

/**
 * Admin: Create a single candidate
 */
exports.createCandidate = async function(req, res) {
    try {
        const { name, username, email, role = "user", preferredRole, password } = req.body;
        const candidateName = (name || username || "").trim();
        const candidateEmail = (email || "").trim().toLowerCase();

        if (!candidateName || !candidateEmail) {
            return res.status(400).json({ message: "Candidate name and email are required." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(candidateEmail)) {
            return res.status(400).json({ message: "Invalid email format." });
        }

        const existing = await User.findOne({ email: candidateEmail });
        if (existing) {
            return res.status(400).json({ message: `A user with email "${candidateEmail}" already exists.` });
        }

        const tempPassword = password && password.trim() ? password.trim() : `Temp#${Math.random().toString(36).slice(-6)}!`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const newUser = await User.create({
            username: candidateName,
            email: candidateEmail,
            password: hashedPassword,
            role: "user",
            preferredRole: preferredRole || "Backend Developer"
        });

        return res.status(201).json({
            message: `Candidate ${candidateName} registered successfully.`,
            candidate: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                preferredRole: newUser.preferredRole,
                createdAt: newUser.createdAt,
                tempPassword: tempPassword
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Admin: Bulk create candidates (CSV or JSON list)
 */
exports.bulkCreateCandidates = async function(req, res) {
    try {
        const { candidates = [] } = req.body;

        if (!Array.isArray(candidates) || candidates.length === 0) {
            return res.status(400).json({ message: "A non-empty list of candidates is required." });
        }

        const added = [];
        const skipped = [];
        const seenEmails = new Set();

        const salt = await bcrypt.genSalt(10);

        for (const item of candidates) {
            const rawName = (item.name || item.username || "").trim();
            const rawEmail = (item.email || "").trim().toLowerCase();
            const rawRole = (item.role || item.preferredRole || "Backend Developer").trim();

            if (!rawName || !rawEmail) {
                skipped.push({ name: rawName, email: rawEmail, reason: "Missing name or email" });
                continue;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(rawEmail)) {
                skipped.push({ name: rawName, email: rawEmail, reason: "Malformed email address" });
                continue;
            }

            if (seenEmails.has(rawEmail)) {
                skipped.push({ name: rawName, email: rawEmail, reason: "Duplicate entry in current upload batch" });
                continue;
            }
            seenEmails.add(rawEmail);

            const existingInDb = await User.findOne({ email: rawEmail });
            if (existingInDb) {
                skipped.push({ name: rawName, email: rawEmail, reason: "Account already exists in system" });
                continue;
            }

            const defaultPassword = item.password || `Candidate#${Math.random().toString(36).slice(-6)}!`;
            const hashedPassword = await bcrypt.hash(defaultPassword, salt);

            const createdUser = await User.create({
                username: rawName,
                email: rawEmail,
                password: hashedPassword,
                role: "user",
                preferredRole: rawRole
            });

            added.push({
                _id: createdUser._id,
                username: createdUser.username,
                email: createdUser.email,
                role: createdUser.role,
                preferredRole: createdUser.preferredRole,
                tempPassword: defaultPassword
            });
        }

        return res.status(200).json({
            message: `Bulk candidate registration complete. Added ${added.length}, skipped ${skipped.length}.`,
            addedCount: added.length,
            skippedCount: skipped.length,
            added,
            skipped
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Admin: Delete a candidate account
 */
exports.deleteCandidate = async function(req, res) {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: "Candidate user not found." });
        }

        if (user.role === "admin") {
            return res.status(403).json({ message: "Cannot delete an administrator account." });
        }

        await user.deleteOne();
        return res.status(200).json({ message: `Candidate ${user.username} (${user.email}) deleted successfully.` });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.updateProfile = async function(req, res) {
    try {
        const { username, preferredRole } = req.body
        const user = await User.findById(req.user._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        if (username) user.username = username
        if (preferredRole) user.preferredRole = preferredRole
        await user.save()
        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}
