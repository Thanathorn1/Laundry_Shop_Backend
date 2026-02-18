const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGO_URI;

async function run() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('Laundry_Delivery');
        const collection = db.collection('users');

        console.log('--- DATABASE STATUS ---');
        console.log('Connected to DB:', db.databaseName);
        console.log('Collection name:', collection.collectionName);

        const users = await collection.find({}).toArray();
        console.log('Total documents in collection:', users.length);

        users.forEach((user, index) => {
            console.log(`[${index + 1}] _id: ${user._id}, email: ${user.email}, role: ${user.role}, fields: ${Object.keys(user).join(', ')}`);
        });

        const allDBs = await client.db().admin().listDatabases();
        console.log('\n--- ALL DATABASES ---');
        allDBs.databases.forEach(dbInfo => console.log(`- ${dbInfo.name}`));

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    } finally {
        await client.close();
    }
}

run();
