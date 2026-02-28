module.exports = {
    PORT: process.env.PORT || 3000,
    CHANNEL_NAME: process.env.CHANNEL_NAME || 'certchain',
    CHAINCODE_NAME: process.env.CHAINCODE_NAME || 'certchain',
    JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_secure_key_123',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/certchain',
    FABRIC_CONNECTION_PROFILE: require('path').resolve(
        __dirname, '..', '..', 'fabric-samples', 'test-network',
        'organizations', 'peerOrganizations', 'org1.example.com',
        'connection-org1.json'
    ),
    WALLET_PATH: require('path').join(__dirname, '..', 'wallet'),
    MSP_ID: 'Org1MSP',
    CA_NAME: 'ca.org1.example.com',
    IPFS_HOST: process.env.IPFS_HOST || 'localhost',
    IPFS_PORT: process.env.IPFS_PORT || 5001,
    IPFS_PROTOCOL: process.env.IPFS_PROTOCOL || 'http',
};