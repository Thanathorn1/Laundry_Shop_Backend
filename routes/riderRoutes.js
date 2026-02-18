const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware: Rider only
const riderAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'rider') return res.status(403).json({ message: 'Rider only' });
        req.user = user;
        next();
    } catch {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// GET /api/rider/orders — orders that are ready for delivery
router.get('/orders', riderAuth, async (req, res) => {
    try {
        const orders = await Order.find({ status: { $in: ['ready', 'delivered'] } })
            .populate('user', 'name phone')
            .populate('shop', 'name address')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/rider/orders/:id — update to delivered
router.put('/orders/:id', riderAuth, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
