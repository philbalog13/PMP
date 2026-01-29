# Welcome to Fined-Sim

**Fined-Sim** is a pedagogical payment platform simulator designed to teach the internal workings of payment systems. It simulates the complete lifecycle of a transaction, from the Payment Terminal (PO) to the Issuer Bank, including the Acquirer, Network Switch, and Hardware Security Module (HSM).

## 🚀 Key Features

- **End-to-End Simulation**: PO -> Acquirer -> Network -> Issuer.
- **Real ISO 8583**: Messages are formatted according to ISO standards.
- **Cryptography**: Visualization of PIN Block generation, MAC calculation, and Key rotation.
- **Fraud Detection**: Real-time analysis of transactions (Simulated).
- **Interactive UI**: 3D Virtual Card, Real-time Transaction Map, admin dashboard.

## 🎯 Pedagogical Goals

This platform is intended for students and professionals wishing to understand:

1.  **Payment Flows**: How authorization, clearing, and settlement work.
2.  **Security**: Concepts of symmetric/asymmetric cryptography, HS, PCI-DSS.
3.  **Modern Architecture**: Microservices, Docker, Event-driven design.
4.  **DevOps**: CI/CD, Monitoring (Prometheus/Grafana), Docker Compose.

## 📚 Documentation Sections

-   **[Architecture](architecture/overview.md)**: Deep dive into the system design.
-   **[Installation](installation/setup.md)**: Get up and running in minutes.
-   **[Pedagogy](pedagogy/learning-path.md)**: Structured learning modules.
-   **[API](api/endpoints.md)**: Developers guide to the backend services.

---

*Built with ❤️ for education.*
