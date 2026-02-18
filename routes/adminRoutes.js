const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { requireAuth, admin } = require('../middleware/authMiddleware');

// GET /api/admin/stats
router.get('/stats', requireAuth, admin, async (req, res) => {
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
router.get('/orders', requireAuth, admin, async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'name phone email').populate('shop', 'name address').sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/admin/orders/:id
router.put('/orders/:id', requireAuth, admin, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/riders
router.get('/riders', requireAuth, admin, async (req, res) => {
    try {
        const riders = await User.find({ role: 'rider' }).select('-password').sort({ createdAt: -1 });
        res.json(riders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/riders/pending
router.get('/riders/pending', requireAuth, admin, async (req, res) => {
    try {
        const riders = await User.find({ role: 'rider', riderStatus: 'pending' }).select('-password').sort({ createdAt: -1 });
        res.json(riders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/admin/riders/:id/approve
router.put('/riders/:id/approve', requireAuth, admin, async (req, res) => {
    try {
        const rider = await User.findById(req.params.id);
        if (!rider || rider.role !== 'rider') {
            return res.status(404).json({ message: 'Rider not found' });
        }
        rider.riderStatus = 'approved';
        rider.isActive = true;
        await rider.save();
        res.json({ message: 'Rider approved successfully', rider });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/admin/riders/:id/reject
router.put('/riders/:id/reject', requireAuth, admin, async (req, res) => {
    try {
        const rider = await User.findById(req.params.id);
        if (!rider || rider.role !== 'rider') {
            return res.status(404).json({ message: 'Rider not found' });
        }
        rider.riderStatus = 'rejected';
        rider.isActive = false;
        await rider.save();
        res.json({ message: 'Rider rejected successfully', rider });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
