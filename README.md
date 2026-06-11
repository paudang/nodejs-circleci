# zzzzz

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![License](https://img.shields.io/badge/License-ISC-blue.svg)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg)

A production-ready Node.js microservice generated with **MVC** and **MySQL**.
This project follows a strict **7-Step Production-Ready Process** to ensure quality and scalability from day one.

---

## 7-Step Production-Ready Process

1.  **Initialize Git**: `git init` (Required for Husky hooks and security gates).
2.  **Install Dependencies**: `npm install` (or pnpm / yarn).
3.  **Setup Environment**: `cp .env.example .env` and fill in necessary keys.
4.  **Start Infrastructure**: `docker-compose up -d` (If you chose databases or Kafka).
5.  **Run Development**: `npm run dev` (or `pnpm dev` / `yarn dev`).
6.  **Verify Standards**: `npm run lint` and `npm test` (Enforce 80% coverage).
7.  **Build & Deploy**: `npm run build` followed by `npm run deploy` (via PM2).

---

## Key Features

-   **Architecture**: MVC (MVC Pattern).
-   **Database**: MySQL (via Sequelize).

-   **Security**: Helmet, CORS, Rate Limiting, HPP, Snyk SCA.
-   **Quality**: 80%+ Test Coverage, Eslint, Prettier, Husky.
-   **DevOps**: Multi-stage Docker, CI/CD ready (GitHub/GitLab/Jenkins/Bitbucket/CircleCI).

## 📂 Project Structure

The project follows **MVC** principles.
- **Model**: Database schemas and data logic.
- **View**: Template engines or API responders.
- **Controller**: Orchestrates flow between Model and View.

---

## 🛠️ Detailed Getting Started

Follow the **🚀 7-Step Production-Ready Process** summary at the top, or follow these detailed instructions:

### 1. Prerequisites
-   Node.js (v18+)
-   Docker & Docker Compose

### 2. Environment Setup
Copy the example environment file and adjust the values as needed:
```bash
cp .env.example .env
```

### 3. Infrastructure & App Launch
```bash
# Initialize Git for security hooks
git init

# Install dependencies
npm install # (or pnpm install / yarn install)

# Start required services
docker-compose up -d db redis

# (Optional) Start ELK Stack for Centralized Logging
docker-compose -f docker-compose.elk.yml up -d

# Run the app in development mode
npm run dev # (or pnpm dev / yarn dev)
```

### 📊 Observability (ELK Stack)
This project is configured with a localized **Elasticsearch & Kibana** stack for centralized logging.
When you run `docker-compose -f docker-compose.elk.yml up -d`, the following services will start:
- **Elasticsearch**: `http://localhost:9200`
- **Kibana UI**: `http://localhost:5601`

**How to test logs locally (First-Time Setup):**
1. In your app code, simply use `logger.info('message', { event: 'test' })`. (Kibana requires at least one log to exist before it lets you view them).
2. Open Kibana (`http://localhost:5601`) in your browser. Click **"Explore on my own"** if greeted by the Welcome screen.
3. Open the menu (top left) and navigate to **Management > Stack Management > Data Views**.
4. Click **Create data view**. Enter `my-app-logs*` in both the Name and Index pattern fields.
5. Save it, then go to **Analytics > Discover** to see your logs in real-time.

### 4. Quality & Standards
```bash
# Lint & Format
npm run lint
npm run format

# Run Unit/Integration Tests
npm test
npm run test:coverage
```

API is exposed via **GraphQL**.
The Apollo Sandbox UI for API exploration and documentation is available natively, fully embedded for offline development:
- **URL**: `http://localhost:3000/graphql` (Dynamic based on PORT)

If you are opening `http://localhost:3000/graphql` in your browser, you can directly run the following in the Apollo Sandbox UI:

**Query to get all users:**
```graphql
query GetAllUsers {
  getAllUsers {
    id
    name
    email
  }
}
```

**Mutation to create a user:**
```graphql
mutation CreateUser {
  createUser(name: "John Doe", email: "john@example.com") {
    id
    name
    email
  }
}
```

**Mutation to update a user (Protected):**
```graphql
mutation UpdateUser {
  updateUser(id: "1", name: "John Updated") {
    id
    name
    email
  }
}
```

**Mutation to delete a user (Protected):**
```graphql
mutation DeleteUser {
  deleteUser(id: "1")
}
```

## Caching
This project uses **Redis** for caching.
- **Client**: `ioredis`
- **Connection**: Configured via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in `.env`.

## Logging
This project uses **Winston** for structured logging.
- **Development**: Logs are printed to the console.
- **Production**: Logs are saved to files:
  - `error.log`: Only error level logs.
  - `combined.log`: All logs.

## Docker Deployment
This project uses a **Multi-Stage Dockerfile** for optimized production images.

### 1. Running Locally (Development)
To run the Node.js application locally while using Docker for the infrastructure (Database, Redis, Kafka, etc.):

```bash
# Start infrastructure
docker-compose up -d db redis

# Start the application
npm run dev # (or pnpm dev / yarn dev)
```

### 2. Running the App Container with Compose Infrastructure
If you want to run the application itself inside a Docker container while connecting to the infrastructure managed by your `docker-compose.yml`:

```bash
# First, ensure your infrastructure is running
docker-compose up -d

# Build Production Image
docker build -t zzzzz .

# Run Container (attached to the compose network)
docker run -p 3000:3000 --network zzzzz_default \
  -e DB_HOST=db \
  -e REDIS_HOST=redis \
  zzzzz
```
## PM2 Deployment (VPS/EC2)
This project is pre-configured for direct deployment to a VPS/EC2 instance using **PM2** (via `ecosystem.config.js`).
1. Install dependencies
```bash
npm install # (or pnpm install / yarn install)
```
2. **Start Infrastructure (DB, Redis, Kafka, etc.) in the background**
*(This specifically starts the background services without running the application inside Docker, allowing PM2 to handle it).*
```bash
docker-compose up -d db redis
docker-compose -f docker-compose.elk.yml up -d
```
3. **Wait 5-10s** for the database to fully initialize.
4. **Deploy the App using PM2 in Cluster Mode**
```bash
npm run deploy
```
5. **Check logs**
```bash
npx pm2 logs
```
6. Stop and remove the PM2 application
```bash
npx pm2 delete zzzzz
```
7. Stop and remove the Docker infrastructure
```bash
docker-compose down
docker-compose -f docker-compose.elk.yml down
```

## 🔒 Security Features
-   **Helmet**: Sets secure HTTP headers.
-   **CORS**: Configured for cross-origin requests.
-   **Rate Limiting**: Protects against DDoS / Brute-force.
-   **HPP**: Prevents HTTP Parameter Pollution attacks.

## AI-Native Development

This project is "AI-Ready" out of the box. We have pre-configured industry-leading AI context files to bridge the gap between "Generated Code" and "AI-Assisted Development."

- **Magic Defaults**: We've automatically tailored your AI context to focus on **zzzzz** and its specific architectural stack (MVC, MySQL, etc.).
- **Use Cursor?** We've configured **`.cursorrules`** at the root. It enforces project standards (80% coverage, MVC/Clean) directly within the editor.
- *Pro-tip*: You can customize the `Project Goal` placeholder in `.cursorrules` to help the AI understand your specific business logic!
- **Use ChatGPT/Gemini/Claude?** Check the **`prompts/`** directory. It contains highly-specialized Agent Skill templates. You can copy-paste these into any LLM to give it a "Senior Developer" understanding of your codebase immediately.
