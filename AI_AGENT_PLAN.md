# Wallet Balance Tracker - AI Agent Implementation Plan

Based on the "Wallet Balance Tracker" project from `crypto_coding_projects_guide.md`.

## Project Overview
**Goal:** Build a system to track wallet balances across multiple chains (Ethereum, Polygon, Arbitrum), handle ERC-20 tokens, store history, and serve data via API.

**Tech Stack:**
- Language: TypeScript / Node.js
- Web3: Ethers.js
- API: Express.js
- Database: PostgreSQL
- External APIs: Alchemy/Infura (RPC), CoinGecko (Prices)

## Implementation Phases

### Phase 1: Basic Setup & RPC Connection (Current Status: Complete)
- [x] Initialize Git & Node.js project
- [x] Install dependencies (express, ethers, pg, dotenv, typescript)
- [x] Create directory structure
- [x] **Task 1.1:** Configure Environment Variables
    - Create `.env.example` with placeholders for `RPC_URL_ETH`, `RPC_URL_POLYGON`, `RPC_URL_ARBITRUM`, `DATABASE_URL`, `COINGECKO_API_KEY`.
    - Setup `src/config/config.ts` to load and validate these.
- [x] **Task 1.2:** RPC Provider Setup
    - Create `src/services/blockchain.service.ts`.
    - Implement a class/function to initialize `ethers.JsonRpcProvider` for each chain.
    - Test connection to a public RPC (e.g., Cloudflare or Ankr for testing) in a script.

### Phase 2: Address Validation & Basic Balance (Current Status: Complete)
- [x] **Task 2.1:** Address Validation
    - Create `src/utils/validation.ts`.
    - Implement `isValidAddress(address: string): boolean` using `ethers.isAddress`.
- [x] **Task 2.2:** Native Balance Fetching
    - Add method to `BlockchainService`: `getNativeBalance(address: string, chain: string): Promise<bigint>`.
    - Handle errors and different chain IDs.

### Phase 3: ERC-20 Token Integration
- [ ] **Task 3.1:** Token Configuration
    - Create a config file (e.g., `src/config/tokens.ts`) mapping popular Token Symbols -> Contract Addresses per chain.
- [ ] **Task 3.2:** ERC-20 Balance Fetching
    - Add `getTokenBalance(address: string, tokenAddress: string, chain: string)` to `BlockchainService`.
    - Use a minimal ERC-20 ABI (balanceOf, decimals, symbol).
- [ ] **Task 3.3:** Batch Queries (Optimization)
    - Implement `Promise.all` or `Multicall` (if using a multicall library) to fetch multiple token balances efficiently.

### Phase 4: Database & History
- [ ] **Task 4.1:** Database Schema
    - Design schema: `wallets`, `balances` (wallet_id, token_address, chain, amount, timestamp), `prices`.
    - Create migration scripts (or use an ORM like TypeORM/Prisma if desired, currently raw `pg` is installed).
- [ ] **Task 4.2:** Storage Service
    - Create `src/services/storage.service.ts` to save fetched balances.

### Phase 5: Price Feeds & Portfolio Value
- [ ] **Task 5.1:** CoinGecko Integration
    - Create `src/services/price.service.ts`.
    - Fetch current prices for ETH, MATIC, ARB, and tracked tokens.
- [ ] **Task 5.2:** Value Calculation
    - Combine Balance * Price to get USD value.

### Phase 6: API & Frontend
- [ ] **Task 6.1:** Express API
    - `GET /api/balance/:address?chain=eth`
    - `GET /api/portfolio/:address` (aggregated value)
    - `GET /api/history/:address`
- [ ] **Task 6.2:** Simple Dashboard
    - Create a basic HTML/JS frontend in `public/` or a separate React app to consume the API.

## Instructions for AI Agent
1. Read this plan.
2. Pick the next unchecked task.
3. Implement the code in the corresponding files.
4. Create a test script or run the code to verify.
5. Mark the task as checked.
6. Repeat.

