const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const adminEmail = 'admin@laundrypro.com';
        const user = await User.findOne({ email: adminEmail });

        if (user) {
            console.log('ADMIN_FOUND');
            console.log('Role:', user.role);
            console.log('Status:', user.riderStatus);
            console.log('Active:', user.isActive);
        } else {
            console.log('ADMIN_NOT_FOUND');
        }
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

checkAdmin();
