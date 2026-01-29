# Prerequisites

Before installing Fined-Sim, ensure your system meets the following requirements.

## System Requirements

-   **OS**: Windows 10/11 (WSL2 recommended), macOS, or Linux.
-   **RAM**: Minimum 8GB (16GB recommended for full stack with metrics).
-   **Disk Space**: 10GB free space (for Docker images).

## Software Requirements

### 1. Docker & Docker Compose
The platform runs entirely in containers to ensure consistency.
-   [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
-   Verify installation:
    ```bash
    docker --version
    docker-compose --version
    ```

### 2. Node.js (Optional)
Required only if you plan to run services without Docker or develop locally.
-   **Version**: Node 18 or 20 (LTS).
-   [Install Node.js](https://nodejs.org/)

### 3. Git
To clone the repository.
-   [Install Git](https://git-scm.com/downloads)

### 4. Code Editor
VS Code is recommended with the following extensions:
-   ESLint
-   Prettier
-   Docker
