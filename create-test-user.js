const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createTestUser = async () => {
    try {
        console.log('Connecting to:', process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@'));
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB:', mongoose.connection.name);

        const email = 'test_find_me@example.com';
        await User.deleteMany({ email }); // Clear old ones

        const testUser = new User({
            name: 'FIND_ME_IN_COMPASS_NOW',
            email: email,
            phone: '1234567890',
            password: 'password123',
            role: 'customer'
        });

        await testUser.save();
        console.log('✅ TEST USER CREATED!');
        console.log('Please search for email "test_find_me@example.com" in Compass.');

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

createTestUser();
