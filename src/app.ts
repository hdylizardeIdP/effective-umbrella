import express from 'express';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import config from './config/config';

dotenv.config();

const app = express();
const port = config.port;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Static files (for frontend)
app.use(express.static('public'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Wallet Balance Tracker API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      balance: '/api/balance/:address',
      portfolio: '/api/portfolio/:address',
      history: '/api/history/:address',
    },
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(port, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Wallet Balance Tracker API                  ║
║   Version: 1.0.0                              ║
║   Port: ${port}                                   ║
║   Environment: ${config.nodeEnv}                     ║
╚═══════════════════════════════════════════════╝

API Endpoints:
  • GET  /api/health
  • GET  /api/balance/:address
  • GET  /api/portfolio/:address
  • GET  /api/history/:address

Ready to track wallet balances! 🚀
  `);
});

