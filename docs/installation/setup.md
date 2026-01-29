# Setup Guide

## Step 1: Clone the Repository

```bash
git clone https://github.com/Fined-Sim/PMP.git
cd PMP
```

## Step 2: Configure Environment

We provide a script to generate the necessary `.env` files.

```bash
# Windows (PowerShell)
./scripts/generate-env.ps1

# Linux/Mac
./scripts/generate-env.sh
```

Or manually copy the example:
```bash
cp .env.example .env
```

## Step 3: Build and Start

Using Docker Compose is the easiest way to start all services.

```bash
docker-compose up -d --build
```

*Note: The first build may take 5-10 minutes.*

## Step 4: Verify Installation

Check the status of running containers:

```bash
docker-compose ps
```

All services should be `Up` (healthy).

## Step 5: Access the Platform

Open your browser:

-   **Dashboard**: [http://localhost:3000](http://localhost:3000)
-   **Virtual Card**: [http://localhost:3001](http://localhost:3001)
-   **Payment Terminal (TPE)**: [http://localhost:3002](http://localhost:3002)
-   **API Documentation**: [http://localhost:8080/docs](http://localhost:8080/docs)
