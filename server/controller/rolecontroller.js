const Role = require("../models/role_schema");
const Question = require("../models/question_schema");

exports.createRole = async function(req, res) {
    try {
        const { title, description, domains, aliases, status } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Role title is required" });
        }

        const existing = await Role.findOne({ title: { $regex: new RegExp(`^${title.trim()}$`, "i") } });
        if (existing) {
            return res.status(400).json({ message: `Role "${title}" already exists in the system.` });
        }

        const role = await Role.create({
            title: title.trim(),
            description: description || "",
            domains: Array.isArray(domains) ? domains : [],
            aliases: Array.isArray(aliases) ? aliases : [],
            status: status || "Active"
        });

        return res.status(201).json({ message: "Role created successfully", role });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getroles = async function(req, res) {
    try {
        const roles = await Role.find().sort({ createdAt: -1 });

        // Augment each role with actual question count from MongoDB
        const enrichedRoles = await Promise.all(roles.map(async (r) => {
            const roleObj = r.toObject();
            const qCount = await Question.countDocuments({
                role: { $regex: new RegExp(`^${r.title}$`, "i") }
            });
            roleObj.questions = qCount;
            return roleObj;
        }));

        return res.status(200).json({
            roles: enrichedRoles
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.updateRole = async function(req, res) {
    try {
        const { id } = req.params;
        const { title, description, domains, aliases, status } = req.body;

        let role = null;
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(id)) {
            role = await Role.findById(id);
        }
        if (!role && title) {
            role = await Role.findOne({ title: { $regex: new RegExp(`^${title.trim()}$`, "i") } });
        }

        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }

        if (title && title.trim()) role.title = title.trim();
        if (description !== undefined) role.description = description;
        if (Array.isArray(domains)) role.domains = domains;
        if (Array.isArray(aliases)) role.aliases = aliases;
        if (status) role.status = status;

        await role.save();

        const qCount = await Question.countDocuments({
            role: { $regex: new RegExp(`^${role.title}$`, "i") }
        });
        const roleObj = role.toObject();
        roleObj.questions = qCount;

        return res.status(200).json({
            message: "Role updated successfully",
            role: roleObj
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.deleteRole = async function(req, res) {
    try {
        const { id } = req.params;
        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }

        await role.deleteOne();
        return res.status(200).json({ message: `Role "${role.title}" deleted successfully` });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
