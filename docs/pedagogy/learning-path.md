# Learning Path

Fined-Sim is structured into 3 levels of difficulty.

## Level 1: Apprentice (Fundamentals)

**Goal**: Understand the basic payment flow and key actors.

-   **Module 1**: [The 4-Corner Model](workshops.md#workshop-1-the-4-corner-model)
    -   Role of Acquirer, Issuer, Merchant, Cardholder.
-   **Module 2**: [Transaction Anatomy](workshops.md#workshop-2-iso-8583-basics)
    -   Reading specific fields (PAN, Amount, MTI).
-   **Practice**: Perform a standard transaction and trace it in logs.

## Level 2: Engineer (Security & Crypto)

**Goal**: Master the security mechanisms protecting payments.

-   **Module 3**: [PIN Security](workshops.md#workshop-3-pin-blocks)
    -   PIN Block formats (ISO-0, ISO-3).
    -   HSM translation.
-   **Module 4**: [Cryptography](workshops.md#workshop-4-mac-and-keys)
    -   Symmetric keys (ZPK, ZMK).
    -   MAC (Message Authentication Code) validation.

## Level 3: Architect (Advanced)

**Goal**: Design resilient and fraud-resistant systems.

-   **Module 5**: [Fraud Detection](workshops.md#workshop-5-fraud-rules)
    -   Velocity checks, Geolocation rules.
-   **Module 6**: [Resilience](workshops.md#workshop-6-chaos-engineering)
    -   Handling timeouts, reversals (SAF - Store and Forward).
