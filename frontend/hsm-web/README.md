# HSM Admin Interface

Web interface for the Educational HSM Simulator.

## Features
- **Key Management**: View, Load, and Delete Keys (ZPK, CVK).
- **Logs**: Real-time view of HSM operations.
- **Vulnerability Lab**: Toggle educational vulnerabilities.

## Setup
```bash
npm install
npm run dev
```

## Internal Architecture
- **Next.js**: Framework.
- **TailwindCSS**: Styling.
- **API Client**: Communicates with `backend/hsm-sim` on port 3004.
