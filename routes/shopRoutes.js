const express = require('express');
const router = express.Router();
const path = require('path');
const Shop = require('../models/Shop');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// @desc    Get all shops (branches)
// @route   GET /api/shops
router.get('/', async (req, res) => {
    const shops = await Shop.find({});
    res.json(shops);
});

// @desc    Get shop by ID
// @route   GET /api/shops/:id
router.get('/:id', async (req, res) => {
    const shop = await Shop.findById(req.params.id);
    if (shop) {
        res.json(shop);
    } else {
        res.status(404).json({ message: 'Shop not found' });
    }
});

// @desc    Create a shop with image upload (Admin)
// @route   POST /api/shops
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
    try {
        const { name, address, phone, openHours, lat, lng } = req.body;

        const imageUrl = req.file
            ? `/uploads/shop/${req.file.filename}`
            : null;

        const shop = new Shop({
            name,
            address,
            phone,
            openHours,
            image: imageUrl,
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
            },
        });

        const createdShop = await shop.save();
        res.status(201).json(createdShop);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Update a shop (Admin)
// @route   PUT /api/shops/:id
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) return res.status(404).json({ message: 'Shop not found' });

        const { name, address, phone, openHours, lat, lng } = req.body;
        shop.name = name || shop.name;
        shop.address = address || shop.address;
        shop.phone = phone || shop.phone;
        shop.openHours = openHours || shop.openHours;
        if (lat && lng) {
            shop.location = { lat: parseFloat(lat), lng: parseFloat(lng) };
        }
        if (req.file) {
            shop.image = `/uploads/shop/${req.file.filename}`;
        }

        const updated = await shop.save();
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @desc    Delete a shop (Admin)
// @route   DELETE /api/shops/:id
router.delete('/:id', protect, admin, async (req, res) => {
    const shop = await Shop.findById(req.params.id);
    if (shop) {
        await shop.deleteOne();
        res.json({ message: 'Shop removed' });
    } else {
        res.status(404).json({ message: 'Shop not found' });
    }
});

module.exports = router;
