import express from 'express';
import { config, validateConfig, SupportedChain } from './config/config';
import { getBlockchainService } from './services/blockchain.service';
import { getStorageService } from './services/storage.service';
import { getPriceService } from './services/price.service';
import { getPortfolioService } from './services/portfolio.service';
import { initializeDatabase } from './db/database';
import { isValidAddress } from './utils/validation';
import { getAllTokenSymbols, getAvailableTokens } from './config/tokens';

const app = express();

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Wallet Balance Tracker API',
    timestamp: new Date().toISOString(),
  });
});

// Config validation endpoint
app.get('/health/config', (req, res) => {
  const validation = validateConfig();
  res.json({
    valid: validation.valid,
    errors: validation.errors,
    chains: Object.keys(config.chains),
  });
});

// RPC connection status endpoint
app.get('/health/rpc', async (req, res) => {
  try {
    const blockchainService = getBlockchainService();
    const connectionStatuses = await blockchainService.testAllConnections();

    const allConnected = connectionStatuses.every((status) => status.connected);

    res.json({
      status: allConnected ? 'healthy' : 'degraded',
      connections: connectionStatuses,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test specific chain connection
app.get('/health/rpc/:chain', async (req, res) => {
  const chain = req.params.chain as 'ethereum' | 'polygon' | 'arbitrum';
  const validChains = ['ethereum', 'polygon', 'arbitrum'];

  if (!validChains.includes(chain)) {
    res.status(400).json({
      error: `Invalid chain. Supported chains: ${validChains.join(', ')}`,
    });
    return;
  }

  try {
    const blockchainService = getBlockchainService();
    const status = await blockchainService.testConnection(chain);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      chain,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get native balance for an address on a specific chain
app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;
  const chain = (req.query.chain as SupportedChain) || 'ethereum';
  const validChains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum'];

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: 'Invalid Ethereum address',
    });
    return;
  }

  if (!validChains.includes(chain)) {
    res.status(400).json({
      error: `Invalid chain. Supported chains: ${validChains.join(', ')}`,
    });
    return;
  }

  try {
    const blockchainService = getBlockchainService();
    const balance = await blockchainService.getNativeBalance(address, chain);
    res.json(balance);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch balance',
    });
  }
});

// Get native balance for an address across all chains
app.get('/api/balance/:address/all', async (req, res) => {
  const { address } = req.params;

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: 'Invalid Ethereum address',
    });
    return;
  }

  try {
    const blockchainService = getBlockchainService();
    const balances = await blockchainService.getNativeBalanceAllChains(address);
    res.json({
      address,
      balances,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch balances',
    });
  }
});

// Get list of supported tokens
app.get('/api/tokens', (req, res) => {
  const chain = req.query.chain as SupportedChain | undefined;

  if (chain) {
    const validChains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum'];
    if (!validChains.includes(chain)) {
      res.status(400).json({
        error: `Invalid chain. Supported chains: ${validChains.join(', ')}`,
      });
      return;
    }
    const tokens = getAvailableTokens(chain);
    res.json({ chain, tokens });
  } else {
    res.json({ tokens: getAllTokenSymbols() });
  }
});

// Get token balance for an address
app.get('/api/token/:address/:symbol', async (req, res) => {
  const { address, symbol } = req.params;
  const chain = (req.query.chain as SupportedChain) || 'ethereum';
  const validChains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum'];

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: 'Invalid Ethereum address',
    });
    return;
  }

  if (!validChains.includes(chain)) {
    res.status(400).json({
      error: `Invalid chain. Supported chains: ${validChains.join(', ')}`,
    });
    return;
  }

  try {
    const blockchainService = getBlockchainService();
    const balance = await blockchainService.getTokenBalanceBySymbol(address, symbol, chain);
    res.json(balance);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch token balance',
    });
  }
});

// Get all token balances for an address on a specific chain
app.get('/api/tokens/:address', async (req, res) => {
  const { address } = req.params;
  const chain = (req.query.chain as SupportedChain) || 'ethereum';
  const validChains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum'];

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: 'Invalid Ethereum address',
    });
    return;
  }

  if (!validChains.includes(chain)) {
    res.status(400).json({
      error: `Invalid chain. Supported chains: ${validChains.join(', ')}`,
    });
    return;
  }

  try {
    const blockchainService = getBlockchainService();
    const balances = await blockchainService.getAllTokenBalances(address, chain);
    res.json({
      address,
      chain,
      tokens: balances,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch token balances',
    });
  }
});

// Get balance history for an address
app.get('/api/history/:address', async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain as SupportedChain | undefined;
  const tokenSymbol = req.query.token as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: 'Invalid Ethereum address',
    });
    return;
  }

  try {
    const storageService = getStorageService();
    const history = await storageService.getBalanceHistory(address, {
      chain,
      tokenSymbol,
      limit,
      offset,
    });
    res.json({
      address,
      history,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch history',
    });
  }
});

// Save current balances snapshot for an address
app.post('/api/snapshot/:address', async (req, res) => {
  const { address } = req.params;
  const chain = (req.query.chain as SupportedChain) || 'ethereum';
  const validChains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum'];

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: 'Invalid Ethereum address',
    });
    return;
  }

  if (!validChains.includes(chain)) {
    res.status(400).json({
      error: `Invalid chain. Supported chains: ${validChains.join(', ')}`,
    });
    return;
  }

  try {
    const blockchainService = getBlockchainService();
    const storageService = getStorageService();

    // Fetch current balances
    const nativeBalance = await blockchainService.getNativeBalance(address, chain);
    const tokenBalances = await blockchainService.getAllTokenBalances(address, chain);

    // Save to database
    await storageService.saveNativeBalance(nativeBalance);
    for (const tokenBalance of tokenBalances) {
      await storageService.saveTokenBalance(tokenBalance);
    }

    res.json({
      message: 'Snapshot saved successfully',
      address,
      chain,
      nativeBalance,
      tokenBalances,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save snapshot',
    });
  }
});

// Get latest stored balances for an address
app.get('/api/stored/:address', async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain as SupportedChain | undefined;

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: 'Invalid Ethereum address',
    });
    return;
  }

  try {
    const storageService = getStorageService();
    const balances = await storageService.getLatestBalances(address, chain);
    res.json({
      address,
      balances,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch stored balances',
    });
  }
});

// Get current prices for tokens
app.get('/api/prices', async (req, res) => {
  try {
    const priceService = getPriceService();
    const prices = await priceService.getAllTrackedPrices();
    res.json({
      prices,
      supportedTokens: priceService.getSupportedTokens(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch prices',
    });
  }
});

// Get price for a specific token
app.get('/api/prices/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const priceService = getPriceService();
    const price = await priceService.fetchPrice(symbol);

    if (!price) {
      res.status(404).json({
        error: `Price not available for ${symbol}`,
      });
      return;
    }

    res.json(price);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch price',
    });
  }
});

// Get portfolio value for an address (single chain)
app.get('/api/portfolio/:address', async (req, res) => {
  const { address } = req.params;
  const chain = req.query.chain as SupportedChain | undefined;
  const validChains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum'];

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: 'Invalid Ethereum address',
    });
    return;
  }

  if (chain && !validChains.includes(chain)) {
    res.status(400).json({
      error: `Invalid chain. Supported chains: ${validChains.join(', ')}`,
    });
    return;
  }

  try {
    const portfolioService = getPortfolioService();

    if (chain) {
      const result = await portfolioService.getPortfolioForChain(address, chain);
      res.json({
        address,
        chain,
        totalValueUsd: result.totalValueUsd,
        balances: result.balances,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      const portfolio = await portfolioService.getFullPortfolio(address);
      res.json(portfolio);
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch portfolio',
    });
  }
});

async function startServer() {
  // Initialize database if configured
  if (config.databaseUrl) {
    try {
      await initializeDatabase();
      console.log('Database connected and initialized');
    } catch (error) {
      console.warn('Database initialization failed:', error instanceof Error ? error.message : error);
      console.warn('Running without database support');
    }
  } else {
    console.log('No DATABASE_URL configured - running without database support');
  }

  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
    console.log('Supported chains:', Object.keys(config.chains).join(', '));
  });
}

startServer();
