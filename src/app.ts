import express from 'express';
import { config, validateConfig } from './config/config';
import { getBlockchainService } from './services/blockchain.service';

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

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
  console.log('Supported chains:', Object.keys(config.chains).join(', '));
});
