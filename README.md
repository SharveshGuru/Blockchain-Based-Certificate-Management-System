# ⛓ CertChain — Blockchain-Based Certificate Management System

A decentralized certificate management system built on **Hyperledger Fabric 2.5**, **IPFS**, and **MongoDB**. Supports issuing, verifying, and revoking certificates across six domains: Academic, Government, Legal, Identity, Corporate, and Medical.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│              (Vite + TypeScript + Tailwind)              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (REST API)
┌──────────────────────▼──────────────────────────────────┐
│                   Express API Server                     │
│           (Node.js + fabric-network SDK)                 │
└───────┬──────────────┬──────────────────┬───────────────┘
        │              │                  │
   ┌────▼────┐   ┌─────▼──────┐   ┌──────▼──────┐
   │ MongoDB │   │    IPFS    │   │  Hyperledger │
   │(metadata│   │(cert PDFs) │   │   Fabric 2.5 │
   │ cache)  │   │            │   │  (immutable  │
   └─────────┘   └────────────┘   │   hash store)│
                                  └──────────────┘
```

**Certificate flow:**
1. Issuer submits certificate data → PDF generated with QR code
2. SHA-256 hash computed from PDF → Merkle tree built
3. PDF uploaded to IPFS → returns CID
4. Hash + CID + metadata stored on Hyperledger Fabric
5. Recipient notified with downloadable certificate
6. Verifier uploads PDF → hash recomputed → checked against blockchain → VALID / TAMPERED

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Blockchain | Hyperledger Fabric | 2.5.14 |
| Fabric CA | fabric-ca | 1.5.15 |
| Smart Contract | Node.js Chaincode | — |
| Consensus | etcd Raft | — |
| State DB | CouchDB | 3.3.3 |
| Distributed Storage | IPFS Kubo | 0.27.0 |
| Backend | Node.js + Express | 18.20.8 + 5.x |
| Fabric SDK | fabric-network | 2.2.20 |
| Database | MongoDB | 8.0.19 |
| Frontend | React + Vite + TypeScript | — |
| Styling | Tailwind CSS | — |
| Container Runtime | Docker | 27.5.1 |
| OS | Ubuntu | 22.04.5 LTS |

> ⚠️ **Critical:** Docker Engine **v27.x** is required. Hyperledger Fabric 2.5 is incompatible with Docker Engine v28+ due to a breaking change in the Docker socket API used internally by the peer node for chaincode container builds.

---

## 📋 Prerequisites

### System Requirements
- Ubuntu 22.04 LTS (tested) — other Linux distributions should work
- Minimum 8 GB RAM, 4 CPU cores, 50 GB free disk space
- Non-root user with sudo access

### 1. Docker Engine v27.x

> Do **not** install Docker Desktop or the latest Docker Engine. You must install v27.5.1 specifically.

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

# Install Docker v27.5.1 specifically
sudo apt-get install -y \
  docker-ce=5:27.5.1-1~ubuntu.22.04~jammy \
  docker-ce-cli=5:27.5.1-1~ubuntu.22.04~jammy \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Pin version to prevent auto-upgrade
sudo apt-mark hold docker-ce docker-ce-cli

# Add user to docker group
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version        # Must show 27.5.1
docker compose version  # Must show v2.x
```

### 2. Node.js 18 LTS via nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 18
nvm use 18
nvm alias default 18

node --version   # v18.x.x
npm --version    # 10.x.x
```

### 3. IPFS Kubo v0.27.0

```bash
cd /tmp
curl -LO https://dist.ipfs.tech/kubo/v0.27.0/kubo_v0.27.0_linux-amd64.tar.gz
tar -xzf kubo_v0.27.0_linux-amd64.tar.gz
sudo bash kubo/install.sh
rm -rf kubo kubo_v0.27.0_linux-amd64.tar.gz

ipfs init --profile=lowpower
ipfs version   # 0.27.0
```

### 4. MongoDB 8.0

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

sudo systemctl start mongod
sudo systemctl enable mongod

mongod --version   # v8.0.x
```

### 5. Hyperledger Fabric 2.5.14 Binaries and Docker Images

```bash
mkdir -p $HOME/Documents/project
cd $HOME/Documents/project

curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh

# Downloads binaries + Docker images (takes 10–20 min, ~2 GB)
./install-fabric.sh --fabric-version 2.5.14 --ca-version 1.5.15 d b s
```

Add Fabric binaries to PATH:

```bash
cat >> ~/.bashrc << 'EOF'

# Hyperledger Fabric
export PATH=$PATH:$HOME/Documents/project/fabric-samples/bin
export FABRIC_CFG_PATH=$HOME/Documents/project/fabric-samples/config
EOF

source ~/.bashrc

# Verify
peer version       # Version: v2.5.14
cryptogen version
configtxgen --version
fabric-ca-client version   # Version: v1.5.15
```

---

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
cd $HOME/Documents/project
git clone https://github.com/<your-username>/Blockchain-Based-Certificate-Management-System.git
cd Blockchain-Based-Certificate-Management-System
```

### 2. Install Hyperledger fabric-samples inside the repo

`fabric-samples/` is excluded from the repository via `.gitignore` because it contains large binaries and auto-generated crypto material. You need to download it directly into the project folder.

```bash
# Make sure you are inside the project root
cd $HOME/Documents/project/Blockchain-Based-Certificate-Management-System

# Download the official Fabric install script
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh

# Install Fabric 2.5.14 — downloads Docker images, CLI binaries, and fabric-samples
# d = Docker images   b = binaries   s = fabric-samples
# This takes 10-20 minutes and downloads ~2 GB
./install-fabric.sh --fabric-version 2.5.14 --ca-version 1.5.15 d b s
```

This creates `fabric-samples/` inside your project root, which is exactly where the network scripts and API expect it.

Then add the Fabric binaries to your PATH permanently:

```bash
cat >> ~/.bashrc << 'EOF'

# Hyperledger Fabric
export PATH=$PATH:$HOME/Documents/project/Blockchain-Based-Certificate-Management-System/fabric-samples/bin
export FABRIC_CFG_PATH=$HOME/Documents/project/Blockchain-Based-Certificate-Management-System/fabric-samples/config
EOF

source ~/.bashrc
```

Verify all Fabric tools are available:

```bash
peer version              # Version: v2.5.14
fabric-ca-client version  # Version: v1.5.15
cryptogen version
configtxgen --version
```

### 3. Add hostnames to /etc/hosts

```bash
echo "127.0.0.1 orderer.certchain.example.com"       | sudo tee -a /etc/hosts
echo "127.0.0.1 peer0.org1.certchain.example.com"    | sudo tee -a /etc/hosts
echo "127.0.0.1 host.docker.internal"                | sudo tee -a /etc/hosts
```

---

## ▶️ Running the System

You need **four terminals** open simultaneously.

### Terminal 1 — IPFS Daemon

```bash
ipfs daemon
```

Keep this running. Wait until you see `Daemon is ready`.

### Terminal 2 — Fabric Network

Generate crypto material, start Docker containers, create channel, deploy chaincode:

```bash
cd $HOME/Documents/project/Blockchain-Based-Certificate-Management-System/fabric-samples/test-network

export DOCKER_SOCK=/var/run/docker.sock

# Start the network with CouchDB
./network.sh up createChannel -c mychannel -s couchdb

# Deploy the CertChain chaincode
./network.sh deployCC \
  -ccn certchain \
  -ccp ../../chaincode/certchain \
  -ccl javascript
```

Wait for:
```
Committed chaincode definition for chaincode 'certchain' on channel 'mychannel'
```

### Terminal 3 — Backend API

```bash
cd $HOME/Documents/project/Blockchain-Based-Certificate-Management-System/api

npm install

# Enroll the admin identity (first time only)
node enrollAdmin.js

# Register application user (first time only)
node registerUser.js

# Start the API server
node index.js
```

API runs at: `http://localhost:3000`

### Terminal 4 — Frontend

```bash
cd $HOME/Documents/project/Blockchain-Based-Certificate-Management-System/frontend

npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🔌 API Endpoints

Base URL: `http://localhost:3000`

### Certificates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/certificates/issue` | Issue a new certificate |
| `POST` | `/api/certificates/verify` | Verify by uploading PDF |
| `GET` | `/api/certificates/verify/:hash` | Verify by document hash |
| `GET` | `/api/certificates/recipient/:id` | Get all certs for recipient |
| `GET` | `/api/certificates/issuer/:id` | Get all certs from issuer |
| `POST` | `/api/certificates/revoke/:certId` | Revoke a certificate |
| `GET` | `/api/certificates/history/:certId` | Get certificate history |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and get JWT |

---

## 📁 Project Structure

```
Blockchain-Based-Certificate-Management-System/
├── api/                        # Express REST API
│   ├── index.js                # Server entry point
│   ├── enrollAdmin.js          # Enroll Fabric admin identity
│   ├── registerUser.js         # Register app user
│   ├── middleware/             # Auth and upload middleware
│   ├── models/                 # Mongoose models
│   ├── routes/                 # API route handlers
│   ├── services/               # Fabric gateway and IPFS services
│   └── utils/                  # PDF and QR code generators
├── chaincode/
│   └── certchain/              # Hyperledger Fabric smart contract (Node.js)
│       ├── index.js            # Chaincode entry point
│       ├── META-INF/           # CouchDB index definitions
│       └── package.json
├── fabric-samples/             # Hyperledger Fabric test network
│   └── test-network/           # Network scripts and crypto config
├── frontend/                   # React + Vite + TypeScript UI
│   └── src/
│       ├── App.jsx
│       ├── api.js              # Axios API client
│       └── components/         # Dashboard components per role
└── README.md
```

---

## 🎭 User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Manage organizations, view all certificates, system settings |
| **Organization / Issuer** | Issue and revoke certificates for recipients |
| **Recipient** | View and download own certificates |
| **Verifier** | Upload and verify certificate authenticity |

---

## 📜 Certificate Types

| Type | Examples |
|------|---------|
| ACADEMIC | Degree, Diploma, Transcript, Mark Sheet |
| GOVERNMENT | Birth, Marriage, Caste, Income, Domicile |
| LEGAL | Affidavit, Court Order, Property Deed |
| IDENTITY | Aadhaar Proof, PAN, Driving License, Passport |
| CORPORATE | Incorporation, GST, ISO, Employment |
| MEDICAL | Vaccination, Disability, Fitness, Blood Group |

---

## 🛑 Stopping the System

### Option A — Temporary Pause ✅ (preserves all data and blockchain state)

Use this when you want to take a break and resume later. Blockchain ledger, channel, and chaincode are all preserved in Docker volumes.

```bash
# Stop all Fabric Docker containers (does NOT delete volumes or ledger)
docker stop $(docker ps -q)

# Stop IPFS
pkill -f "ipfs daemon"

# Stop MongoDB (optional — data persists on disk regardless)
sudo systemctl stop mongod

# Stop API and Frontend: Ctrl+C in their terminals
```

To **resume** after a pause:

```bash
# Restart all Docker containers — ledger state is fully intact
docker start $(docker ps -aq)

# Restart IPFS
ipfs daemon &

# Restart MongoDB if you stopped it
sudo systemctl start mongod

# Restart the backend API
cd $HOME/Documents/project/Blockchain-Based-Certificate-Management-System/api
node index.js

# Restart the frontend
cd $HOME/Documents/project/Blockchain-Based-Certificate-Management-System/frontend
npm run dev
```

> After resuming you do **not** need to re-run `enrollAdmin.js`, `registerUser.js`, `deployCC`, or rejoin the channel. Everything is intact.

---

### Option B — Full Teardown 🗑️ (destroys all blockchain data)

Only use this when you want a completely clean slate.

```bash
cd $HOME/Documents/project/Blockchain-Based-Certificate-Management-System/fabric-samples/test-network
./network.sh down

# Stop IPFS, API, Frontend: Ctrl+C in their terminals
```

After a full teardown you must redo the entire startup sequence from Terminal 2, including `enrollAdmin.js` and `registerUser.js`.

---

## 🐛 Troubleshooting

### Docker broken pipe error during chaincode install
**Cause:** Docker Engine v28 or v29 is installed. Fabric 2.5 is incompatible with these versions.
**Fix:** Downgrade to Docker Engine v27.5.1 (see Prerequisites section).

### `peer: command not found`
**Fix:**
```bash
export PATH=$PATH:$HOME/Documents/project/fabric-samples/bin
source ~/.bashrc
```

### `Cannot create ledger from genesis block: ledger already exists`
**Cause:** Peer volume from previous run still exists.
**Fix:** Run `./network.sh down` to remove all volumes, then restart.

### MongoDB connection refused
**Fix:**
```bash
sudo systemctl start mongod
sudo systemctl status mongod
```

### IPFS — address already in use
**Fix:**
```bash
rm -f $HOME/.ipfs/repo.lock
ipfs daemon
```

### Fabric peer TLS handshake failure — certificate valid for X, not localhost
**Fix:** Add hostname resolution to `/etc/hosts`:
```bash
echo "127.0.0.1 peer0.org1.certchain.example.com" | sudo tee -a /etc/hosts
echo "127.0.0.1 orderer.certchain.example.com"    | sudo tee -a /etc/hosts
```