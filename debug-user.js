const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const findUser = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected!');

        const email = 'prapawitbunmaarm1@gmail.com';
        const user = await User.findOne({ email });

        if (user) {
            console.log('USER_FOUND');
            console.log('Name:', user.name);
            console.log('Role:', user.role);
            console.log('Rider Status:', user.riderStatus);
            console.log('Active:', user.isActive);
        } else {
            console.log('USER_NOT_FOUND: ' + email);
            const allUsers = await User.find({}).limit(5);
            console.log('Existing users in DB:', allUsers.map(u => u.email));
        }
        process.exit(0);
    } catch (err) {
        console.error('DATABASE_ERROR:', err.message);
        process.exit(1);
    }
};

findUser();
