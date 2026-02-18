const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const listAllUsers = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to:', mongoose.connection.name);

        const users = await User.find({});
        console.log('Total users found:', users.length);

        users.forEach((u, i) => {
            console.log(`[${i + 1}] Email: ${u.email}, Role: ${u.role}, Fields: ${Object.keys(u.toObject())}`);
        });

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in this database:', collections.map(c => c.name));

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
};

listAllUsers();
