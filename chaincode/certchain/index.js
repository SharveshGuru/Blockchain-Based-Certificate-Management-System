'use strict';
const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class CertChainContract extends Contract {
    constructor() {
        super('CertChainContract');
    }

    async InitLedger(ctx) {
        return JSON.stringify({ status: 'SUCCESS', message: 'CertChain ledger initialized' });
    }

    // --- NEW SECURITY HELPER: Check user role ---
    _checkRole(ctx, allowedRole) {
        const userRole = ctx.clientIdentity.getAttributeValue('role');
        if (userRole !== allowedRole) {
            throw new Error(`Unauthorized access: This action requires the "${allowedRole}" role. Your role is "${userRole || 'none'}"`);
        }
    }

    // --- DETERMINISTIC TIMESTAMP HELPER ---
    _getTxDate(ctx) {
        try {
            if (typeof ctx.stub.getTxDate === 'function') {
                return ctx.stub.getTxDate().toISOString();
            }
            const ts = ctx.stub.getTxTimestamp();
            if (!ts) return new Date(0).toISOString();

            let rawSecs = typeof ts.getSeconds === 'function' ? ts.getSeconds() : ts.seconds;
            let secs = 0;
            if (typeof rawSecs === 'number') secs = rawSecs;
            else if (rawSecs && typeof rawSecs.toNumber === 'function') secs = rawSecs.toNumber();
            else if (rawSecs && rawSecs.low !== undefined) secs = rawSecs.low;

            let rawNanos = typeof ts.getNanos === 'function' ? ts.getNanos() : ts.nanos;
            let nanos = typeof rawNanos === 'number' ? rawNanos : 0;

            if (secs > 0) {
                return new Date((secs * 1000) + Math.floor(nanos / 1000000)).toISOString();
            }
        } catch (err) {}
        return new Date(0).toISOString(); 
    }

    async IssueCertificate(ctx, certId, certHash, ipfsCid, issuerOrg, recipientId, certType, metadata) {
        // SECURITY CHECK ADDED
        this._checkRole(ctx, 'issuer');

        const existing = await ctx.stub.getState(certId);
        if (existing && existing.length > 0) throw new Error(`Certificate ${certId} already exists on ledger`);
        
        const validTypes = ['ACADEMIC', 'LEGAL', 'GOVERNMENT', 'CORPORATE'];
        if (!validTypes.includes(certType.toUpperCase())) throw new Error(`Invalid certificate type. Must be one of: ${validTypes.join(', ')}`);
        
        let metadataObj = {};
        try { metadataObj = JSON.parse(metadata); } catch (e) { throw new Error('metadata must be valid JSON string'); }
        
        const txId = ctx.stub.getTxID();
        const timestamp = this._getTxDate(ctx);
        
        const merkleRoot = this._computeMerkleRoot([certHash, certId, issuerOrg, recipientId, txId]);
        const certificate = {
            certId, certHash, merkleRoot, txId, ipfsCid, issuerOrg, recipientId,
            certType: certType.toUpperCase(), metadata: metadataObj, status: 'ACTIVE',
            issuedAt: timestamp, revokedAt: null, revokeReason: null, docType: 'certificate'
        };
        await ctx.stub.putState(certId, Buffer.from(JSON.stringify(certificate)));
        
        ctx.stub.setEvent('CertificateIssued', Buffer.from(JSON.stringify({
            certId, certType: certType.toUpperCase(), issuerOrg, recipientId, issuedAt: timestamp
        })));
        
        return JSON.stringify({ status: 'SUCCESS', certId, merkleRoot, txId, issuedAt: timestamp });
    }

    async VerifyCertificate(ctx, certId, certHashToVerify) {
        const certBytes = await ctx.stub.getState(certId);
        if (!certBytes || certBytes.length === 0) return JSON.stringify({ status: 'NOT_FOUND', valid: false });
        
        const cert = JSON.parse(certBytes.toString());
        if (cert.status === 'REVOKED') return JSON.stringify({ status: 'REVOKED', valid: false, certId, certType: cert.certType, issuerOrg: cert.issuerOrg, revokedAt: cert.revokedAt, revokeReason: cert.revokeReason });
        
        const hashMatches = cert.certHash === certHashToVerify;
        return JSON.stringify({
            status: hashMatches ? 'VERIFIED' : 'TAMPERED',
            valid: hashMatches, certId, certType: cert.certType, issuerOrg: cert.issuerOrg,
            recipientId: cert.recipientId, ipfsCid: cert.ipfsCid, merkleRoot: cert.merkleRoot,
            txId: cert.txId, issuedAt: cert.issuedAt,
            message: hashMatches ? 'Certificate is AUTHENTIC' : 'Certificate hash MISMATCH - document may be tampered'
        });
    }

    async GetCertificate(ctx, certId) {
        const certBytes = await ctx.stub.getState(certId);
        if (!certBytes || certBytes.length === 0) throw new Error(`Certificate ${certId} does not exist`);
        return certBytes.toString();
    }

    async RevokeCertificate(ctx, certId, revokeReason) {
        // SECURITY CHECK ADDED
        this._checkRole(ctx, 'issuer');

        const certBytes = await ctx.stub.getState(certId);
        if (!certBytes || certBytes.length === 0) throw new Error(`Certificate ${certId} does not exist`);
        
        const cert = JSON.parse(certBytes.toString());
        if (cert.status === 'REVOKED') throw new Error(`Certificate ${certId} is already revoked`);
        
        cert.status = 'REVOKED';
        cert.revokedAt = this._getTxDate(ctx);
        cert.revokeReason = revokeReason || 'No reason provided';
        
        await ctx.stub.putState(certId, Buffer.from(JSON.stringify(cert)));
        return JSON.stringify({ status: 'SUCCESS', certId, revokedAt: cert.revokedAt });
    }
    
    async GetCertificatesByRecipient(ctx, recipientId) {
        return await this._runQuery(ctx, JSON.stringify({ selector: { docType: 'certificate', recipientId } }));
    }

    async GetCertificatesByIssuer(ctx, issuerOrg) {
        return await this._runQuery(ctx, JSON.stringify({ selector: { docType: 'certificate', issuerOrg } }));
    }

    async GetCertificatesByType(ctx, certType) {
        return await this._runQuery(ctx, JSON.stringify({ selector: { docType: 'certificate', certType: certType.toUpperCase() } }));
    }
    
    async GetCertificateHistory(ctx, certId) {
        const iterator = await ctx.stub.getHistoryForKey(certId);
        const history = [];
        let result = await iterator.next();
        while (!result.done) {
            const record = { txId: result.value.txId, timestamp: result.value.timestamp, isDelete: result.value.isDelete, value: result.value.value.toString('utf8') };
            try { record.value = JSON.parse(record.value); } catch (e) {}
            history.push(record);
            result = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(history);
    }

    async VerifyByMerkleRoot(ctx, certId, merkleRootToVerify) {
        const certBytes = await ctx.stub.getState(certId);
        if (!certBytes || certBytes.length === 0) return JSON.stringify({ status: 'NOT_FOUND', valid: false });
        
        const cert = JSON.parse(certBytes.toString());
        if (cert.status === 'REVOKED') return JSON.stringify({ status: 'REVOKED', valid: false });
        
        const matches = cert.merkleRoot === merkleRootToVerify;
        return JSON.stringify({ status: matches ? 'VERIFIED' : 'TAMPERED', valid: matches, certId, certType: cert.certType, issuerOrg: cert.issuerOrg, issuedAt: cert.issuedAt });
    }

    _computeMerkleRoot(leaves) {
        if (leaves.length === 0) return '';
        let nodes = leaves.map(l => crypto.createHash('sha256').update(String(l)).digest('hex'));
        while (nodes.length > 1) {
            const next = [];
            for (let i = 0; i < nodes.length; i += 2) {
                const l = nodes[i], r = i + 1 < nodes.length ? nodes[i + 1] : nodes[i];
                next.push(crypto.createHash('sha256').update(l + r).digest('hex'));
            }
            nodes = next;
        }
        return nodes[0];
    }

    async _runQuery(ctx, queryString) {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const results = [];
        let result = await iterator.next();
        while (!result.done) {
            results.push(JSON.parse(result.value.value.toString('utf8')));
            result = await iterator.next();
        }
        await iterator.close();
        return JSON.stringify(results);
    }
}
module.exports = CertChainContract;