# RECOVER-AI 🚀
**Enterprise Grade Autonomous Revenue Recovery Engine**

## Overview
RECOVER-AI is a production-ready, cloud-native platform designed to intelligently recover failed subscription payments. By utilizing Large Language Models (LLMs) securely behind a deterministic Policy Gatekeeper, RECOVER-AI categorizes payment failures and engages customers in empathetic Promise-to-Pay (P2P) dialogues without ever risking policy violations (e.g., unauthorized discounts, infinite retries).

## 🌟 Key Features
- **Deterministic Finite State Machine (FSM)**: Manages lifecycle states securely (FAILED -> DIAGNOSING -> P2P_PAUSED -> PAID).
- **Policy Gatekeeper**: Mathematical bounds on all AI suggestions. Prevents prompt injection from executing unauthorized financial transactions.
- **Asynchronous Processing**: High-throughput queue management via BullMQ and Redis for non-blocking task execution.
- **Idempotency Built-In**: All database mutations and payment retries use robust idempotency keys to prevent double-charging.
- **Rich Observability**: Winston structured logging with Correlation IDs.
- **Zero Ground-Truth Leakage**: The AI engine executes in complete isolation from simulation ground truth parameters.

## 🏗️ Architecture
- **Backend**: Node.js, Express, TypeScript, Zod
- **Database**: PostgreSQL (Prisma ORM)
- **Queue / Caching**: Redis (BullMQ)
- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **AI Integration**: Google Gemini 2.5 (or Mock Provider for offline testing)
- **API Docs**: Swagger UI (`/api-docs`)

## 🛠️ Getting Started (Local Development)

### 1. Prerequisites
- Node.js (v20+)
- Docker & Docker Compose
- A Gemini API Key (optional, defaults to mock mode)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Update `.env` with your `GEMINI_API_KEY` if you want real AI processing, and set `AI_MODE=gemini`.

### 3. Run Dependencies (Postgres & Redis)
```bash
docker-compose up -d postgres redis
```

### 4. Install & Run
```bash
# Install dependencies
npm install

# Push database schema
npm run db:push -w @recover-ai/api

# Start the full system
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Swagger Docs**: http://localhost:4000/api-docs

## 🐳 Running with Docker (Production Grade)
You can run the entire stack (Postgres, Redis, API, and Frontend) in isolated containers:
```bash
docker-compose up -d --build
```
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

## 🛡️ Running Tests
RECOVER-AI enforces quality with a massive Vitest suite:
```bash
npm test
```
The suite includes Red-Team security tests that verify prompt injection defense and boundary limit enforcement.

## ☁️ AWS Deployment Architecture

For a cloud-ready deployment on AWS, we recommend the following topology:
1. **Compute (ECS/Fargate)**: Host the `api` and BullMQ `worker` processes in Amazon Elastic Container Service.
2. **Database (RDS)**: Amazon RDS for PostgreSQL.
3. **Queue (ElastiCache)**: Amazon ElastiCache for Redis.
4. **Static Assets (S3 + CloudFront)**: Deploy the compiled Vite frontend to an S3 bucket served by CloudFront.
5. **Load Balancing**: Application Load Balancer (ALB) to route traffic to the API and manage SSL termination.
6. **CI/CD**: GitHub Actions (included in `.github/workflows/ci.yml`).

## 📚 API Documentation
When the server is running, visit `/api-docs` to interact with the Swagger/OpenAPI endpoints.
