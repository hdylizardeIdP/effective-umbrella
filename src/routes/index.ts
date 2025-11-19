import { Router } from 'express';
import { balanceController } from '../controllers/balance.controller';
import { portfolioController } from '../controllers/portfolio.controller';
import { historyController } from '../controllers/history.controller';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Wallet Balance Tracker API',
  });
});

// Balance routes
router.get('/balance/:address', balanceController.getBalance.bind(balanceController));
router.get(
  '/balance/:address/chain/:chain',
  balanceController.getChainBalance.bind(balanceController)
);
router.get(
  '/balance/:address/complete',
  balanceController.getCompleteBalance.bind(balanceController)
);

// Portfolio routes
router.get('/portfolio/:address', portfolioController.getPortfolio.bind(portfolioController));
router.get(
  '/portfolio/:address/summary',
  portfolioController.getPortfolioSummary.bind(portfolioController)
);
router.get(
  '/portfolio/:address/chain/:chain',
  portfolioController.getChainPortfolio.bind(portfolioController)
);
router.post('/portfolio/:address/track', portfolioController.trackWallet.bind(portfolioController));

// History routes
router.get(
  '/history/:address',
  historyController.getPortfolioHistory.bind(historyController)
);
router.get(
  '/history/:address/balance',
  historyController.getBalanceHistory.bind(historyController)
);
router.get(
  '/history/:address/latest',
  historyController.getLatestBalance.bind(historyController)
);

export default router;
