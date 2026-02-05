const mongoose = require('mongoose');

let isConnected = false;

async function connectDatabase() {
    if (isConnected) {
        console.log('[+] Using existing database connection');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        isConnected = true;
        console.log('\x1b[36m%s\x1b[0m', 'Aeolous Successfully Started');
        console.log('');
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '[-] MongoDB connection error:', error);
        process.exit(1);
    }
}

mongoose.connection.on('disconnected', () => {
    console.log('\x1b[33m%s\x1b[0m', '[~] MongoDB disconnected');
    isConnected = false;
});

module.exports = { connectDatabase, isConnected: () => isConnected };



