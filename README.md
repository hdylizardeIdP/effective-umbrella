# Wallet Balance Tracker

A cryptocurrency wallet balance tracker built with Node.js, TypeScript, and Ethers.js. Track wallet balances across multiple chains (Ethereum, Polygon, Arbitrum) with support for native tokens and ERC-20 tokens, historical data storage, and USD value calculation.

## Features

- 🌐 **Multi-Chain Support**: Ethereum, Polygon, and Arbitrum
- 💰 **Native & ERC-20 Tokens**: Track ETH, MATIC, ARB, and popular tokens (USDC, USDT, DAI, WETH, WBTC, etc.)
- 💵 **USD Valuation**: Real-time price data from CoinGecko
- 📊 **Portfolio Analytics**: Complete portfolio overview with breakdowns by chain and token
- 📈 **Historical Tracking**: Store and query balance history
- 🚀 **Batch Queries**: Optimized parallel queries for fast performance
- 🎨 **Web Dashboard**: Simple, beautiful UI to visualize portfolio
- 🔌 **REST API**: Full-featured API for programmatic access

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- RPC endpoints for Ethereum, Polygon, and Arbitrum (Alchemy, Infura, or public endpoints)
- CoinGecko API key (optional, free tier available)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your RPC URLs and database connection:

```env
# RPC URLs
RPC_URL_ETH=https://eth.llamarpc.com
RPC_URL_POLYGON=https://polygon-rpc.com
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/wallet_tracker

# CoinGecko (optional)
COINGECKO_API_KEY=
```

### 3. Setup Database

Run migrations to create the database schema:

```bash
npm run db:migrate
```

(Optional) Seed with sample data:

```bash
npm run db:seed
```

### 4. Run the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## Project Structure

```
wallet-balance-tracker/
├── src/
│   ├── app.ts                      # Express application entry point
│   ├── config/
│   │   ├── config.ts               # Environment configuration
│   │   └── tokens.ts               # Token address mappings
│   ├── services/
│   │   ├── blockchain.service.ts   # Blockchain RPC interactions
│   │   ├── price.service.ts        # CoinGecko price fetching
│   │   ├── storage.service.ts      # Database operations
│   │   └── portfolio.service.ts    # Portfolio calculations
│   ├── controllers/
│   │   ├── balance.controller.ts   # Balance endpoints
│   │   ├── portfolio.controller.ts # Portfolio endpoints
│   │   └── history.controller.ts   # History endpoints
│   ├── routes/
│   │   └── index.ts                # API route definitions
│   └── utils/
│       └── validation.ts           # Address validation
├── database/
│   ├── schema.sql                  # Database schema
│   ├── migrate.ts                  # Migration script
│   └── seed.ts                     # Seed data script
├── public/
│   └── index.html                  # Web dashboard
└── scripts/
    └── test-rpc.ts                 # RPC connection tester
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Health Check
```
GET /api/health
```

#### Get Balance
```
GET /api/balance/:address
GET /api/balance/:address?chain=ethereum
GET /api/balance/:address?chain=ethereum&token=USDC
GET /api/balance/:address/chain/:chain
GET /api/balance/:address/complete
```

#### Get Portfolio (with USD values)
```
GET /api/portfolio/:address
GET /api/portfolio/:address/summary
GET /api/portfolio/:address/chain/:chain
POST /api/portfolio/:address/track
```

#### Get History
```
GET /api/history/:address
GET /api/history/:address/balance?chain=ethereum&token=ETH
GET /api/history/:address/latest?chain=ethereum&token=ETH
```

### Example API Calls

**Get complete portfolio:**
```bash
curl http://localhost:3000/api/portfolio/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

**Get balance for specific chain:**
```bash
curl http://localhost:3000/api/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/chain/ethereum
```

**Track a wallet (saves to database):**
```bash
curl -X POST http://localhost:3000/api/portfolio/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/track \
  -H "Content-Type: application/json" \
  -d '{"label": "Vitalik"}'
```

## Web Dashboard

Access the web dashboard at `http://localhost:3000`

Features:
- Enter any Ethereum address
- View complete portfolio across all chains
- See native and ERC-20 token balances
- USD valuations for all assets
- Responsive design for mobile and desktop

## Supported Tokens

### Ethereum
- Native: ETH
- ERC-20: USDC, USDT, DAI, WETH, WBTC, UNI, LINK

### Polygon
- Native: MATIC
- ERC-20: USDC, USDT, DAI, WETH, WBTC, WMATIC

### Arbitrum
- Native: ARB (as gas token)
- ERC-20: USDC, USDT, DAI, WETH, WBTC, ARB

To add more tokens, edit `src/config/tokens.ts`

## Development

### Available Scripts

```bash
npm run dev        # Run in development mode with hot reload
npm run build      # Compile TypeScript to JavaScript
npm start          # Run compiled production build
npm run db:migrate # Run database migrations
npm run db:seed    # Seed database with sample data
npm run test:rpc   # Test RPC connections
```

### Testing RPC Connections

```bash
npm run test:rpc
```

This will test connectivity to all configured RPC endpoints.

## Database Schema

The application uses PostgreSQL with the following tables:

- **wallets**: Tracked wallet addresses
- **balances**: Historical balance snapshots
- **prices**: Token price history from CoinGecko
- **portfolio_snapshots**: Aggregated portfolio values over time

Views:
- **latest_balances**: Most recent balance for each wallet/chain/token
- **latest_prices**: Most recent price for each token

## Architecture

### Services Layer

- **BlockchainService**: Handles all RPC interactions with blockchain networks
- **PriceService**: Fetches token prices from CoinGecko with caching
- **StorageService**: Database operations for persisting data
- **PortfolioService**: Combines balances and prices for portfolio calculations

### Optimizations

- **Batch Queries**: Uses `Promise.all()` for parallel RPC calls
- **Price Caching**: 1-minute TTL cache to reduce API calls
- **Database Indexing**: Optimized indexes for fast queries
- **Connection Pooling**: PostgreSQL connection pool for efficiency

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment | No | development |
| `RPC_URL_ETH` | Ethereum RPC endpoint | Yes | - |
| `RPC_URL_POLYGON` | Polygon RPC endpoint | Yes | - |
| `RPC_URL_ARBITRUM` | Arbitrum RPC endpoint | Yes | - |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `COINGECKO_API_KEY` | CoinGecko API key | No | - |
| `MAX_REQUESTS_PER_MINUTE` | Rate limit | No | 30 |

## Troubleshooting

**Database connection errors:**
- Ensure PostgreSQL is running
- Verify DATABASE_URL is correct
- Check that the database exists

**RPC connection errors:**
- Verify RPC URLs are correct
- Check for rate limiting
- Try using alternative RPC providers (Alchemy, Infura, QuickNode)

**Price fetch errors:**
- CoinGecko free tier has rate limits
- Add API key for higher limits
- Price service has built-in caching to reduce calls

## AI Agent Development

See [AI_AGENT_PLAN.md](./AI_AGENT_PLAN.md) for the step-by-step implementation guide.

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

