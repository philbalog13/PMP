# System Architecture

## Overview

Fined-Sim follows a **Microservices Architecture** to simulate distinct entities in the payment ecosystem. This decoupling allows students to understand the specific role of each component (Acquirer, Issuer, Network) independently.

### Core Components

1.  **Frontend (TPE & Card Web)**
    -   **TPE Web**: React app simulating a physical Payment Terminal.
    -   **Card Web**: React app displaying the virtual card and allowing customer interaction.
    -   **Monitoring Dashboard**: React admin interface for transaction visualization.

2.  **API Gateway**
    -   Entry point for all frontend requests.
    -   Handles initial authentication and routing.

3.  **Backend Services**
    -   **Sim-Network-Switch**: Routes transactions based on BIN (Bank Identification Number).
    -   **Sim-Auth-Engine**: Rules engine for fraud and authorization logic.
    -   **Crypto-Service**: Handles cryptographic operations (PIN Blocks, MAC).
    -   **HSM-Simulator**: Simulates a Hardware Security Module for key management.
    -   **Monitoring-Service**: Collects metrics and logs via WebSockets/Prometheus.

4.  **Infrastructure**
    -   **Docker Compose**: Orchestration.
    -   **PostgreSQL**: Persistence (simulated).
    -   **Redis**: Caching and pub/sub.
    -   **Elasticsearch & Kibana**: Log aggregation and visualization.

## Technologies

-   **Runtime**: Node.js (TypeScript)
-   **Frontend**: React, Vite, TailwindCSS
-   **Communication**: HTTP/REST, WebSocket
-   **Containerization**: Docker

## Data Flow (Simplified)

1.  User inserts card/types PIN on **TPE**.
2.  TPE sends encrypted data to **Acquirer** (Gateway).
3.  Gateway forwards to **Network Switch**.
4.  Switch identifies **Issuer** via BIN.
5.  switch requests **HSM** to translate PIN Block.
6.  Issuer consults **Auth Engine** for rules (Fraud/Balance).
7.  Response flows back to TPE: Approved/Declined.
