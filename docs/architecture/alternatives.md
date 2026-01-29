# Alternatives Considered

## 1. Monolithic Application

**Description:** Building the Acquirer, Switch, and Issuer logic into a single Express.js application.

**Pros:**
-   Easier to deploy (one container).
-   Simple debugging (no network calls between components).

**Cons:**
-   **Pedagogically Weak:** Does not teach the distributed nature of payments. Students miss the concept of "hops" and timeouts.
-   **Scaling:** Cannot scale just the Switch component if load increases.

**Verdict:** Rejected. The complexity of microservices is a feature, not a bug, for this learning platform.

## 2. Java / Spring Boot

**Description:** Using Java, the industry standard for banking, for the backend.

**Pros:**
-   Realistic: Most real banks use Java/C#.
-   Strong typing and enterprise patterns.

**Cons:**
-   **Learning Curve:** High for students who might only know JS/Python.
-   **Resource Heavy:** Requires significantly more RAM for Docker containers, making it hard to run the full stack on a student laptop (8GB RAM target).

**Verdict:** Rejected in favor of Node.js used lightweight resource footprint.

## 3. Real ISO 8583 Binary Protocol

**Description:** Using raw TCP sockets and binary bitmaps for inter-service communication.

**Pros:**
-   Extreme realism.

**Cons:**
-   **Debugging:** Binary protocols are unreadable without special tools.
-   **Difficulty:** Would distract from the core logic (cryptography, fraud rules).

**Verdict:** Compromise. We use JSON over HTTP but **restructure the JSON fields** to mimic ISO 8583 (e.g., fields `002`, `004`, `037`) to teach the data format without the parsing headache.
