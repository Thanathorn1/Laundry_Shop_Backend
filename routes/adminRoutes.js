const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Shop = require('../models/Shop');
const jwt = require('jsonwebtoken');

// Middleware: Admin only
const adminAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
        req.user = user;
        next();
    } catch {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// GET /api/admin/stats
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [orders, users, shops] = await Promise.all([
            Order.find(),
            User.countDocuments({ role: 'user' }),
            Shop.countDocuments(),
        ]);
        const totalRevenue = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + (o.totalPrice || 0), 0);
        res.json({ totalRevenue, totalOrders: orders.length, totalUsers: users, totalShops: shops });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/orders
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'name phone email').populate('shop', 'name address').sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/admin/orders/:id
router.put('/orders/:id', adminAuth, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/riders
router.get('/riders', adminAuth, async (req, res) => {
    try {
        const riders = await User.find({ role: 'rider' }).select('-password');
        res.json(riders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
