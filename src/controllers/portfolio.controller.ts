import { Request, Response } from 'express';
import { portfolioService } from '../services/portfolio.service';
import { storageService } from '../services/storage.service';
import { isValidAddress } from '../utils/validation';
import { ChainName } from '../services/blockchain.service';

export class PortfolioController {
  /**
   * GET /api/portfolio/:address
   * Get complete portfolio with USD values
   */
  async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { save } = req.query;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      const saveToDB = save === 'true';
      const portfolio = await portfolioService.getCompletePortfolio(address, saveToDB);

      res.json(portfolio);
    } catch (error) {
      console.error('Error getting portfolio:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }

  /**
   * GET /api/portfolio/:address/summary
   * Get portfolio summary (lighter version)
   */
  async getPortfolioSummary(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      const summary = await portfolioService.getPortfolioSummary(address);
      res.json(summary);
    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }

  /**
   * GET /api/portfolio/:address/chain/:chain
   * Get portfolio for a specific chain with USD values
   */
  async getChainPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const { address, chain } = req.params;
      const { save } = req.query;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      const saveToDB = save === 'true';
      const portfolio = await portfolioService.getChainPortfolio(
        address,
        chain as ChainName,
        saveToDB
      );

      res.json(portfolio);
    } catch (error) {
      console.error('Error getting chain portfolio:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }

  /**
   * POST /api/portfolio/:address/track
   * Start tracking a wallet
   */
  async trackWallet(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { label } = req.body;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      const portfolio = await portfolioService.trackWallet(address, label);

      res.status(201).json({
        message: 'Wallet tracked successfully',
        portfolio,
      });
    } catch (error) {
      console.error('Error tracking wallet:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }
}

export const portfolioController = new PortfolioController();
