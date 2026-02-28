const { create } = require('ipfs-http-client');
const { IPFS_HOST, IPFS_PORT, IPFS_PROTOCOL } = require('../config/constants');

const ipfs = create({ host: IPFS_HOST, port: IPFS_PORT, protocol: IPFS_PROTOCOL });

const uploadToIPFS = async (buffer) => {
    const result = await ipfs.add(buffer);
    return result.path;
};

const downloadFromIPFS = async (cid) => {
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) chunks.push(chunk);
    return Buffer.concat(chunks);
};

module.exports = { uploadToIPFS, downloadFromIPFS };