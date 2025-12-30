import { SupportedChain } from '../config/config';
import { getBlockchainService, NativeBalance, TokenBalance } from './blockchain.service';
import { getPriceService, TokenPrice } from './price.service';

export interface BalanceWithValue {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  priceUsd: number | null;
  valueUsd: number | null;
  chain: SupportedChain;
  isNative: boolean;
  tokenAddress: string | null;
}

export interface PortfolioSummary {
  address: string;
  totalValueUsd: number;
  chains: {
    chain: SupportedChain;
    totalValueUsd: number;
    balances: BalanceWithValue[];
  }[];
  lastUpdated: string;
}

export class PortfolioService {
  async getPortfolioForChain(
    address: string,
    chain: SupportedChain
  ): Promise<{ balances: BalanceWithValue[]; totalValueUsd: number }> {
    const blockchainService = getBlockchainService();
    const priceService = getPriceService();

    // Fetch balances
    const [nativeBalance, tokenBalances] = await Promise.all([
      blockchainService.getNativeBalance(address, chain),
      blockchainService.getAllTokenBalances(address, chain),
    ]);

    // Collect all symbols for price fetch
    const symbols = [nativeBalance.symbol, ...tokenBalances.map((t) => t.tokenSymbol)];
    await priceService.fetchMultiplePrices(symbols);

    const balances: BalanceWithValue[] = [];
    let totalValueUsd = 0;

    // Process native balance
    const nativePrice = priceService.getCachedPrice(nativeBalance.symbol);
    const nativeValue = nativePrice
      ? parseFloat(nativeBalance.balanceFormatted) * nativePrice.priceUsd
      : null;

    balances.push({
      symbol: nativeBalance.symbol,
      name: nativeBalance.symbol === 'ETH' ? 'Ether' : nativeBalance.symbol,
      balance: nativeBalance.balanceFormatted,
      decimals: nativeBalance.decimals,
      priceUsd: nativePrice?.priceUsd || null,
      valueUsd: nativeValue,
      chain,
      isNative: true,
      tokenAddress: null,
    });

    if (nativeValue) {
      totalValueUsd += nativeValue;
    }

    // Process token balances
    for (const token of tokenBalances) {
      const price = priceService.getCachedPrice(token.tokenSymbol);
      const value = price ? parseFloat(token.balanceFormatted) * price.priceUsd : null;

      balances.push({
        symbol: token.tokenSymbol,
        name: token.tokenName,
        balance: token.balanceFormatted,
        decimals: token.decimals,
        priceUsd: price?.priceUsd || null,
        valueUsd: value,
        chain,
        isNative: false,
        tokenAddress: token.tokenAddress,
      });

      if (value) {
        totalValueUsd += value;
      }
    }

    return { balances, totalValueUsd };
  }

  async getFullPortfolio(address: string): Promise<PortfolioSummary> {
    const blockchainService = getBlockchainService();
    const chains = blockchainService.getSupportedChains();

    const chainResults = await Promise.allSettled(
      chains.map(async (chain) => {
        const result = await this.getPortfolioForChain(address, chain);
        return { chain, ...result };
      })
    );

    const chainData: PortfolioSummary['chains'] = [];
    let totalValueUsd = 0;

    for (const result of chainResults) {
      if (result.status === 'fulfilled') {
        chainData.push({
          chain: result.value.chain,
          totalValueUsd: result.value.totalValueUsd,
          balances: result.value.balances,
        });
        totalValueUsd += result.value.totalValueUsd;
      }
    }

    return {
      address,
      totalValueUsd,
      chains: chainData,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getPortfolioValue(address: string, chain?: SupportedChain): Promise<number> {
    if (chain) {
      const result = await this.getPortfolioForChain(address, chain);
      return result.totalValueUsd;
    }

    const portfolio = await this.getFullPortfolio(address);
    return portfolio.totalValueUsd;
  }
}

// Singleton instance
let portfolioServiceInstance: PortfolioService | null = null;

export function getPortfolioService(): PortfolioService {
  if (!portfolioServiceInstance) {
    portfolioServiceInstance = new PortfolioService();
  }
  return portfolioServiceInstance;
}
