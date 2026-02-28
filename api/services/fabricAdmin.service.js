const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');
const { FABRIC_CONNECTION_PROFILE, WALLET_PATH, MSP_ID, CA_NAME } = require('../config/constants');

const getCA = (ccp) => {
    const caInfo = ccp.certificateAuthorities[CA_NAME];
    return new FabricCAServices(caInfo.url);
};

const getCCP = () => {
    if (!fs.existsSync(FABRIC_CONNECTION_PROFILE)) {
        throw new Error(`Connection profile not found at: ${FABRIC_CONNECTION_PROFILE}`);
    }
    return JSON.parse(fs.readFileSync(FABRIC_CONNECTION_PROFILE, 'utf8'));
};

const syncAdminIdentity = async () => {
    try {
        const ccp = getCCP();
        const ca = getCA(ccp);
        const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        await wallet.put('admin', {
            credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
            mspId: MSP_ID,
            type: 'X.509',
        });
        console.log('✅ Admin Sync Successful');
    } catch (error) {
        console.error(`❌ Sync Failed: ${error.message}`);
    }
};

const registerUserOnFabric = async (username, role) => {
    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
    const adminIdentity = await wallet.get('admin');
    const ccp = getCCP();
    const ca = getCA(ccp);

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const secret = await ca.register({
        affiliation: 'org1.department1',
        enrollmentID: username,
        role: 'client',
        attrs: [{ name: 'role', value: role, ecert: true }]
    }, adminUser);

    const enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret });
    await wallet.put(username, {
        credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
        mspId: MSP_ID,
        type: 'X.509',
    });

    return username;
};

const getContract = async (fabricId) => {
    const ccp = getCCP();
    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
    const gateway = new Gateway();

    const { CHANNEL_NAME, CHAINCODE_NAME } = require('../config/constants');
    await gateway.connect(ccp, { wallet, identity: fabricId, discovery: { enabled: true, asLocalhost: true } });

    const network = await gateway.getNetwork(CHANNEL_NAME);
    return { contract: network.getContract(CHAINCODE_NAME), gateway };
};

module.exports = { syncAdminIdentity, registerUserOnFabric, getContract };