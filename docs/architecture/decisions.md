# Architecture Decision Records (ADR)

## ADR-001: Use of Node.js with TypeScript

**Status:** Accepted

**Context:** The platform simulates a high-concurrency payment environment. We needed a language that handles I/O efficiently and is accessible to students who likely know JavaScript.

**Decision:** We chose Node.js for backend services.
-   **Pros:** Non-blocking I/O, vast ecosystem, consistent language (JS/TS) across full stack.
-   **Cons:** Single-threaded CPU limitations (mitigated by microservices).
-   **Why TypeScript?** To enforce type safety for complex financial data structures (ISO 8583 fields).

## ADR-002: Microservices Architecture

**Status:** Accepted

**Context:** Payments involve distinct legal entities (Bank A, Bank B, Visa, Mastercard) operating independently.

**Decision:** We modeled each simulation component as a separate service accessible via HTTP.
-   **Pros:** Realistic simulation of network latency and distributed system challenges (timeouts, consistency).
-   **Cons:** Complexity in deployment and debugging.

## ADR-003: Simulated HSM vs Real HSM

**Status:** Accepted

**Context:** Real HSMs are hardware devices or expensive cloud services not suitable for a self-hosted student lab.

**Decision:** We built a software simulator (SoftHSM) within the platform.
-   **Pros:** Free, logs internal operations for pedagogy, easy to reset.
-   **Cons:** Not secure for production use (keys in memory).

## ADR-004: Vite for Frontend Tooling

**Status:** Accepted

**Context:** Legacy Create-React-App is slow and deprecated. Students need fast feedback loops.

**Decision:** Use Vite.
-   **Pros:** Instant start, HMR (Hot Module Replacement) is extremely fast.
-   **Cons:** None significant for this project scope.
