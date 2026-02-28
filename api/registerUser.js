const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function registerAndEnroll(userId, userRole) {
    try {
        const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        if (await wallet.get(userId)) {
            console.log(`Identity "${userId}" already exists.`);
            return;
        }

        const adminIdentity = await wallet.get('admin');
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register with 'role' attribute
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: userId,
            role: 'client',
            attrs: [{ name: 'role', value: userRole, ecert: true }]
        }, adminUser);

        const enrollment = await ca.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });

        await wallet.put(userId, {
            credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
            mspId: 'Org1MSP',
            type: 'X.509',
        });

        console.log(`✅ User "${userId}" registered with role: ${userRole}`);
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}

async function run() {
    await registerAndEnroll('university_admin', 'issuer');
    await registerAndEnroll('student_user', 'recipient');
}
run();