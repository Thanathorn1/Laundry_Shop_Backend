const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Production Logic: Riders start as pending and inactive
        const riderStatus = role === 'rider' ? 'pending' : 'approved';
        const isActive = role === 'rider' ? false : true;

        const user = await User.create({
            name,
            email,
            phone,
            password,
            role: role || 'customer',
            riderStatus,
            isActive
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                riderStatus: user.riderStatus,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            // Production Logic: Block non-approved riders
            if (user.role === 'rider' && user.riderStatus !== 'approved') {
                return res.status(403).json({ message: 'บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ' });
            }

            if (!user.isActive) {
                return res.status(403).json({ message: 'บัญชีของคุณถูกระงับการใช้งาน' });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                riderStatus: user.riderStatus,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
