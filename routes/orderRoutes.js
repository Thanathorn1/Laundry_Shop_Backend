const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// @desc    Create new order & Get Stripe Session
// @route   POST /api/orders
router.post('/', protect, async (req, res) => {
    const { shopId, services, totalPrice } = req.body;

    if (services && services.length === 0) {
        res.status(400);
        throw new Error('No order items');
    } else {
        const order = new Order({
            userId: req.user._id,
            shopId,
            services,
            totalPrice,
        });

        const createdOrder = await order.save();

        // Create Stripe Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: services.map(s => ({
                price_data: {
                    currency: 'thb',
                    product_data: { name: s.type },
                    unit_amount: s.price * 100,
                },
                quantity: 1,
            })),
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${createdOrder._id}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            metadata: { orderId: createdOrder._id.toString() }
        });

        createdOrder.stripeSessionId = session.id;
        await createdOrder.save();

        res.status(201).json({ url: session.url, orderId: createdOrder._id });
    }
});

// @desc    Update order to paid & Send Email
// @route   PUT /api/orders/:id/pay
router.put('/:id/pay', protect, async (req, res) => {
    const order = await Order.findById(req.params.id).populate('userId', 'name email');

    if (order) {
        order.paymentStatus = 'paid';

        // Generate QR Code for order pickup
        const qrData = JSON.stringify({ orderId: order._id, userId: order.userId._id });
        const qrImageUrl = await QRCode.toDataURL(qrData);
        order.qrCode = qrImageUrl;

        const updatedOrder = await order.save();

        // Update User Points
        const user = await User.findById(order.userId._id);
        user.points += Math.floor(order.totalPrice / 10); // 1 point per 10 THB
        await user.save();

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: order.userId.email,
            subject: 'Laundry Order Confirmation',
            html: `<h1>Thank you for your order, ${order.userId.name}!</h1>
             <p>Your order #${order._id} has been paid successfully.</p>
             <p>Total: ${order.totalPrice} THB</p>
             <p>Show this QR code at the shop to collect your items:</p>
             <img src="${qrImageUrl}" alt="Pick-up QR Code" />`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log(error);
        });

        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
});

// @desc    Get user orders
// @route   GET /api/orders/myorders
router.get('/myorders', protect, async (req, res) => {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
});

module.exports = router;
