const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const adminEmail = 'admin@laundrypro.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin user already exists.');
            process.exit(0);
        }

        const adminPassword = 'adminPassword123'; // คุณสามารถเปลี่ยนรหัสผ่านตรงนี้ได้
        const adminUser = new User({
            name: 'System Admin',
            email: adminEmail,
            phone: '0000000000',
            password: adminPassword,
            role: 'admin',
            riderStatus: 'approved',
            isActive: true
        });

        await adminUser.save();
        console.log('-----------------------------------');
        console.log('Admin account created successfully!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('-----------------------------------');
        console.log('Please change your password after logging in.');

        process.exit(0);
    } catch (err) {
        console.error('Error seeding admin:', err.message);
        process.exit(1);
    }
};

seedAdmin();
