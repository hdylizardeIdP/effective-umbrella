import { blockchainService, ChainName } from './blockchain.service';
import { priceService } from './price.service';
import { storageService } from './storage.service';

interface TokenWithValue {
  symbol: string;
  name: string;
  balance: bigint;
  formatted: string;
  decimals: number;
  address?: string;
  priceUsd: number;
  valueUsd: number;
}

interface ChainPortfolio {
  chain: ChainName;
  native: TokenWithValue;
  tokens: TokenWithValue[];
  totalValueUsd: number;
}

interface CompletePortfolio {
  address: string;
  chains: ChainPortfolio[];
  totalValueUsd: number;
  breakdown: {
    byChain: { [chain: string]: number };
    byToken: { [symbol: string]: number };
  };
  timestamp: Date;
}

class PortfolioService {
  /**
   * Get portfolio with USD values for a specific chain
   */
  async getChainPortfolio(
    address: string,
    chain: ChainName,
    saveToDB: boolean = false
  ): Promise<ChainPortfolio> {
    // Get balances from blockchain
    const balances = await blockchainService.getAllBalances(address, chain);

    // Get native token price
    const nativePrice = await priceService.getPriceBySymbol(balances.native.symbol);

    // Calculate native token value
    const nativeValueUsd = priceService.calculateValue(
      balances.native.formatted,
      nativePrice.priceUsd
    );

    const nativeWithValue: TokenWithValue = {
      symbol: balances.native.symbol,
      name: balances.native.symbol,
      balance: balances.native.balance,
      formatted: balances.native.formatted,
      decimals: 18,
      priceUsd: nativePrice.priceUsd,
      valueUsd: nativeValueUsd,
    };

    // Process token balances
    const tokensWithValue: TokenWithValue[] = [];
    let totalTokenValue = 0;

    for (const token of balances.tokens) {
      try {
        // Skip tokens with zero balance
        if (token.balance === BigInt(0)) {
          continue;
        }

        const tokenPrice = await priceService.getPriceBySymbol(token.symbol);
        const tokenValueUsd = priceService.calculateValue(
          token.formatted,
          tokenPrice.priceUsd
        );

        tokensWithValue.push({
          ...token,
          priceUsd: tokenPrice.priceUsd,
          valueUsd: tokenValueUsd,
        });

        totalTokenValue += tokenValueUsd;

        // Save to database if requested
        if (saveToDB) {
          await storageService.saveTokenBalance(
            address,
            chain,
            token.address,
            token.symbol,
            token.name,
            token.decimals,
            token.balance,
            token.formatted
          );
        }
      } catch (error) {
        console.warn(`Failed to get price for ${token.symbol}:`, error);
        // Add token with zero value if price fetch fails
        tokensWithValue.push({
          ...token,
          priceUsd: 0,
          valueUsd: 0,
        });
      }
    }

    // Save native balance to database if requested
    if (saveToDB) {
      await storageService.saveNativeBalance(
        address,
        chain,
        balances.native.symbol,
        balances.native.balance,
        balances.native.formatted
      );
    }

    const totalValueUsd = nativeValueUsd + totalTokenValue;

    return {
      chain,
      native: nativeWithValue,
      tokens: tokensWithValue,
      totalValueUsd,
    };
  }

  /**
   * Get complete portfolio across all chains with USD values
   */
  async getCompletePortfolio(
    address: string,
    saveToDB: boolean = false
  ): Promise<CompletePortfolio> {
    const chains = blockchainService.getSupportedChains();

    // Fetch portfolio for all chains in parallel
    const chainPortfolios = await Promise.all(
      chains.map((chain) => this.getChainPortfolio(address, chain, saveToDB))
    );

    // Calculate breakdowns
    const byChain: { [chain: string]: number } = {};
    const byToken: { [symbol: string]: number } = {};
    let totalValueUsd = 0;

    for (const portfolio of chainPortfolios) {
      byChain[portfolio.chain] = portfolio.totalValueUsd;
      totalValueUsd += portfolio.totalValueUsd;

      // Add native token
      byToken[portfolio.native.symbol] =
        (byToken[portfolio.native.symbol] || 0) + portfolio.native.valueUsd;

      // Add ERC-20 tokens
      for (const token of portfolio.tokens) {
        byToken[token.symbol] = (byToken[token.symbol] || 0) + token.valueUsd;
      }
    }

    const completePortfolio: CompletePortfolio = {
      address,
      chains: chainPortfolios,
      totalValueUsd,
      breakdown: {
        byChain,
        byToken,
      },
      timestamp: new Date(),
    };

    // Save portfolio snapshot to database if requested
    if (saveToDB) {
      await storageService.savePortfolioSnapshot(
        address,
        totalValueUsd,
        byChain,
        byToken
      );
    }

    return completePortfolio;
  }

  /**
   * Get portfolio summary (lighter version without full details)
   */
  async getPortfolioSummary(address: string): Promise<{
    address: string;
    totalValueUsd: number;
    byChain: { [chain: string]: number };
    topHoldings: Array<{ symbol: string; valueUsd: number; percentage: number }>;
  }> {
    const portfolio = await this.getCompletePortfolio(address, false);

    // Get top 5 holdings
    const holdings = Object.entries(portfolio.breakdown.byToken)
      .map(([symbol, valueUsd]) => ({
        symbol,
        valueUsd,
        percentage: (valueUsd / portfolio.totalValueUsd) * 100,
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd)
      .slice(0, 5);

    return {
      address: portfolio.address,
      totalValueUsd: portfolio.totalValueUsd,
      byChain: portfolio.breakdown.byChain,
      topHoldings: holdings,
    };
  }

  /**
   * Track a wallet and save initial snapshot
   */
  async trackWallet(address: string, label?: string): Promise<CompletePortfolio> {
    // Create wallet record
    await storageService.getOrCreateWallet(address, label);

    // Fetch and save complete portfolio
    const portfolio = await this.getCompletePortfolio(address, true);

    console.log(`✓ Wallet tracked: ${address} (Total: $${portfolio.totalValueUsd.toFixed(2)})`);

    return portfolio;
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService();
