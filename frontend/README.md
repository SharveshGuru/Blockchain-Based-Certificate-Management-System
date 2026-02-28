# Blockchain Based Certificate Management System

A complete React-based frontend application that simulates a blockchain certificate verification system with role-based access control.

## Features

- **4 User Roles**: Admin, Organization, Recipient (Student), and Verifier
- **Blockchain Simulation**: Mock blockchain hashes, IPFS storage, and Merkle tree verification
- **Certificate Management**: Generate, view, and verify certificates
- **Role-Based Dashboards**: Each role has unique features and permissions
- **Persistent Storage**: Uses localStorage to simulate data persistence
- **Responsive Design**: Clean, professional UI that works on all devices

## Demo Credentials

Use these credentials to log in to different roles:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@blockcert.com | Admin@123 |
| Organization | org@rmkec.ac.in | Org@123 |
| Recipient | student@rmkec.ac.in | Student@123 |
| Verifier | verifier@tcs.com | Verify@123 |

## Installation & Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:5173`

## User Roles & Features

### 1. Admin Dashboard
- View system overview and statistics
- Monitor all registered users
- Track all issued certificates
- View verification status

### 2. Organization Dashboard
- Generate new certificates for students
- View issued certificates
- Track certificate statistics
- Simulated blockchain storage

### 3. Recipient Dashboard
- Access assigned certificates
- View certificate details (blockchain hash, IPFS hash, etc.)
- Download certificates as JSON
- View QR code representation

### 4. Verifier Dashboard
- Verify certificate authenticity
- Search by certificate ID
- View complete certificate details
- Timestamp verification records

## Technology Stack

- React 18 (Functional Components & Hooks)
- React Router for navigation
- Pure CSS (no external UI frameworks)
- localStorage for data persistence
- Mock data simulation

## Project Structure

```
src/
├── components/
│   ├── Login.jsx
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   ├── DashboardLayout.jsx
│   ├── AdminDashboard.jsx
│   ├── OrganizationDashboard.jsx
│   ├── RecipientDashboard.jsx
│   └── VerifierDashboard.jsx
├── data/
│   └── mockData.js
├── styles/
│   ├── Login.css
│   ├── Navbar.css
│   ├── Sidebar.css
│   ├── DashboardLayout.css
│   └── Dashboard.css
├── App.jsx
├── main.tsx
└── index.css
```

## How It Works

### Certificate Generation
When an organization generates a certificate, the system:
1. Creates a unique certificate ID
2. Generates simulated blockchain hash (64-character hex)
3. Creates IPFS hash for distributed storage
4. Generates Merkle root for verification
5. Stores the certificate in localStorage

### Certificate Verification
When a verifier checks a certificate:
1. Searches for the certificate ID in the system
2. Validates against stored blockchain hash
3. Displays complete certificate details
4. Shows timestamp of verification

## Notes

- All blockchain, IPFS, and database operations are simulated using JavaScript
- No backend or external services required
- Data persists in browser localStorage
- Perfect for demonstrations and learning purposes

## Build for Production

```bash
npm run build
```

The optimized production build will be created in the `dist/` folder.
