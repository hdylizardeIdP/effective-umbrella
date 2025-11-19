# Wallet Balance Tracker

A cryptocurrency wallet balance tracker built with Node.js, TypeScript, and Ethers.js.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Configuration:**
    Copy `env.example` to `.env` and fill in your API keys.
    ```bash
    cp env.example .env
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    (Note: You need to add a dev script to package.json, e.g., `"dev": "nodemon src/app.ts"`)

## AI Agent Development

See [AI_AGENT_PLAN.md](./AI_AGENT_PLAN.md) for the step-by-step implementation guide designed for an AI agent to follow.

## Project Structure

- `src/app.ts`: Entry point.
- `src/config/`: Configuration files.
- `src/services/`: Blockchain and business logic.
- `src/controllers/`: API controllers.
- `src/routes/`: API routes.
- `src/models/`: Database models.
- `src/utils/`: Utility functions.

