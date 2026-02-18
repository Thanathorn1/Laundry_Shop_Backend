const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

async function check() {
    console.log('\n--- 📂 Checking .env Files ---');

    // Check local .env (backend folder)
    const backendEnvPath = path.join(__dirname, '.env');
    if (fs.existsSync(backendEnvPath)) {
        const backendEnv = dotenv.parse(fs.readFileSync(backendEnvPath));
        const uri = backendEnv.MONGO_URI || 'NOT FOUND';
        console.log('1. Backend folder .env:');
        console.log('   URI:', uri.replace(/:([^@]+)@/, ':****@'));

        console.log('\n2. Testing connection with this URI...');
        try {
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
            console.log('   ✅ Success! Connection established.');
            await mongoose.disconnect();
        } catch (err) {
            console.log('   ❌ Connection Failed:', err.message);
        }
    } else {
        console.log('1. Backend folder .env: NOT FOUND');
    }

    console.log('\n-----------------------------');
    console.log('💡 Tip: If you see "bad auth", please double check your password in .env');
    console.log('   and make sure it is saved correctly.');

    process.exit(0);
}

check();
