import { Request, Response } from 'express';
import { blockchainService, ChainName } from '../services/blockchain.service';
import { portfolioService } from '../services/portfolio.service';
import { isValidAddress } from '../utils/validation';

export class BalanceController {
  /**
   * GET /api/balance/:address
   * Get balance for a wallet address
   * Query params: chain (optional), token (optional)
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { chain, token } = req.query;

      // Validate address
      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
          message: 'Please provide a valid Ethereum address',
        });
        return;
      }

      // If chain is specified
      if (chain) {
        const chainName = chain as ChainName;
        const supportedChains = blockchainService.getSupportedChains();

        if (!supportedChains.includes(chainName)) {
          res.status(400).json({
            error: 'Invalid chain',
            message: `Supported chains: ${supportedChains.join(', ')}`,
          });
          return;
        }

        // If specific token is requested
        if (token) {
          try {
            const tokenBalance = await blockchainService.getTokenBalanceBySymbol(
              address,
              token as string,
              chainName
            );
            res.json({
              address,
              chain: chainName,
              token: tokenBalance,
            });
            return;
          } catch (error) {
            res.status(404).json({
              error: 'Token not found',
              message: String(error),
            });
            return;
          }
        }

        // Get all balances for the chain
        const balances = await blockchainService.getAllBalances(address, chainName);
        res.json({
          address,
          chain: chainName,
          balances,
        });
        return;
      }

      // Get native balances across all chains
      const nativeBalances = await blockchainService.getAllNativeBalances(address);
      res.json({
        address,
        native_balances: nativeBalances,
      });
    } catch (error) {
      console.error('Error getting balance:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }

  /**
   * GET /api/balance/:address/chain/:chain
   * Get all balances (native + tokens) for a specific chain
   */
  async getChainBalance(req: Request, res: Response): Promise<void> {
    try {
      const { address, chain } = req.params;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      const chainName = chain as ChainName;
      const supportedChains = blockchainService.getSupportedChains();

      if (!supportedChains.includes(chainName)) {
        res.status(400).json({
          error: 'Invalid chain',
          message: `Supported chains: ${supportedChains.join(', ')}`,
        });
        return;
      }

      const balances = await blockchainService.getAllBalances(address, chainName);
      res.json({
        address,
        chain: chainName,
        ...balances,
      });
    } catch (error) {
      console.error('Error getting chain balance:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }

  /**
   * GET /api/balance/:address/complete
   * Get complete balance across all chains
   */
  async getCompleteBalance(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      if (!isValidAddress(address)) {
        res.status(400).json({
          error: 'Invalid wallet address',
        });
        return;
      }

      const portfolio = await blockchainService.getCompletePortfolio(address);
      res.json({
        address,
        portfolio,
      });
    } catch (error) {
      console.error('Error getting complete balance:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: String(error),
      });
    }
  }
}

export const balanceController = new BalanceController();
