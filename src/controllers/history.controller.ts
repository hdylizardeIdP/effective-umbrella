import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { isValidAddress } from '../utils/validation';
import { ChainName } from '../services/blockchain.service';

export class HistoryController {
  /**
   * GET /api/history/:address
   * Get portfolio history for a wallet
   */
  async getPortfolioHistory(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { limit } = req.query;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 30;
      const history = await storageService.getPortfolioHistory(address, limitNum);

      res.json({
        address,
        history,
        count: history.length,
      });
    } catch (error) {
      console.error('Error getting portfolio history:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }

  /**
   * GET /api/history/:address/balance
   * Get balance history for a specific token
   * Query params: chain, token (required)
   */
  async getBalanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { chain, token, limit } = req.query;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      if (!chain || !token) {
        res.status(400).json({
          error: 'Missing parameters',
          message: 'chain and token query parameters are required',
        });
        return;
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 100;
      const history = await storageService.getBalanceHistory(
        address,
        chain as ChainName,
        token as string,
        limitNum
      );

      res.json({
        address,
        chain,
        token,
        history,
        count: history.length,
      });
    } catch (error) {
      console.error('Error getting balance history:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }

  /**
   * GET /api/history/:address/latest
   * Get latest balance for a specific token
   * Query params: chain, token (required)
   */
  async getLatestBalance(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { chain, token } = req.query;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      if (!chain || !token) {
        res.status(400).json({
          error: 'Missing parameters',
          message: 'chain and token query parameters are required',
        });
        return;
      }

      const balance = await storageService.getLatestBalance(
        address,
        chain as ChainName,
        token as string
      );

      if (!balance) {
        res.status(404).json({
          error: 'Not found',
          message: 'No balance history found for this wallet/chain/token combination',
        });
        return;
      }

      res.json({
        address,
        chain,
        token,
        balance,
      });
    } catch (error) {
      console.error('Error getting latest balance:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }
}

export const historyController = new HistoryController();
