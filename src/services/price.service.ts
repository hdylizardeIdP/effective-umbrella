import axios from 'axios';
import { config } from '../config/config';
import { getStorageService } from './storage.service';

// CoinGecko API token IDs
const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  MATIC: 'matic-network',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WETH: 'weth',
  WBTC: 'wrapped-bitcoin',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
};

export interface TokenPrice {
  symbol: string;
  priceUsd: number;
  change24h: number | null;
  lastUpdated: string;
}

export interface PriceCache {
  prices: Map<string, TokenPrice>;
  lastFetched: Date;
}

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export class PriceService {
  private cache: PriceCache = {
    prices: new Map(),
    lastFetched: new Date(0),
  };

  private getCoingeckoId(symbol: string): string | null {
    return COINGECKO_IDS[symbol.toUpperCase()] || null;
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastFetched.getTime() < CACHE_TTL_MS;
  }

  async fetchPrice(symbol: string): Promise<TokenPrice | null> {
    const coingeckoId = this.getCoingeckoId(symbol);
    if (!coingeckoId) {
      return null;
    }

    // Check cache first
    if (this.isCacheValid() && this.cache.prices.has(symbol.toUpperCase())) {
      return this.cache.prices.get(symbol.toUpperCase())!;
    }

    try {
      const url = `https://api.coingecko.com/api/v3/simple/price`;
      const params: Record<string, string> = {
        ids: coingeckoId,
        vs_currencies: 'usd',
        include_24hr_change: 'true',
      };

      if (config.coingeckoApiKey) {
        params['x_cg_demo_api_key'] = config.coingeckoApiKey;
      }

      const response = await axios.get(url, { params });
      const data = response.data[coingeckoId];

      if (!data) {
        return null;
      }

      const price: TokenPrice = {
        symbol: symbol.toUpperCase(),
        priceUsd: data.usd,
        change24h: data.usd_24h_change || null,
        lastUpdated: new Date().toISOString(),
      };

      // Update cache
      this.cache.prices.set(symbol.toUpperCase(), price);
      this.cache.lastFetched = new Date();

      // Save to database if available
      try {
        const storageService = getStorageService();
        await storageService.savePrice(symbol, price.priceUsd);
      } catch {
        // Database not available, skip saving
      }

      return price;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      return null;
    }
  }

  async fetchMultiplePrices(symbols: string[]): Promise<TokenPrice[]> {
    // Filter symbols that have CoinGecko IDs
    const validSymbols = symbols.filter((s) => this.getCoingeckoId(s));

    // Check if all are cached
    if (this.isCacheValid()) {
      const cachedPrices = validSymbols
        .map((s) => this.cache.prices.get(s.toUpperCase()))
        .filter((p): p is TokenPrice => p !== undefined);

      if (cachedPrices.length === validSymbols.length) {
        return cachedPrices;
      }
    }

    // Fetch all at once for efficiency
    const coingeckoIds = validSymbols
      .map((s) => this.getCoingeckoId(s))
      .filter((id): id is string => id !== null);

    if (coingeckoIds.length === 0) {
      return [];
    }

    try {
      const url = `https://api.coingecko.com/api/v3/simple/price`;
      const params: Record<string, string> = {
        ids: coingeckoIds.join(','),
        vs_currencies: 'usd',
        include_24hr_change: 'true',
      };

      if (config.coingeckoApiKey) {
        params['x_cg_demo_api_key'] = config.coingeckoApiKey;
      }

      const response = await axios.get(url, { params });
      const prices: TokenPrice[] = [];

      for (const symbol of validSymbols) {
        const coingeckoId = this.getCoingeckoId(symbol);
        if (!coingeckoId) continue;

        const data = response.data[coingeckoId];
        if (!data) continue;

        const price: TokenPrice = {
          symbol: symbol.toUpperCase(),
          priceUsd: data.usd,
          change24h: data.usd_24h_change || null,
          lastUpdated: new Date().toISOString(),
        };

        prices.push(price);
        this.cache.prices.set(symbol.toUpperCase(), price);

        // Save to database if available
        try {
          const storageService = getStorageService();
          await storageService.savePrice(symbol, price.priceUsd);
        } catch {
          // Database not available, skip saving
        }
      }

      this.cache.lastFetched = new Date();
      return prices;
    } catch (error) {
      console.error('Failed to fetch multiple prices:', error);
      return [];
    }
  }

  async getAllTrackedPrices(): Promise<TokenPrice[]> {
    const symbols = Object.keys(COINGECKO_IDS);
    return this.fetchMultiplePrices(symbols);
  }

  getCachedPrice(symbol: string): TokenPrice | null {
    return this.cache.prices.get(symbol.toUpperCase()) || null;
  }

  getSupportedTokens(): string[] {
    return Object.keys(COINGECKO_IDS);
  }
}

// Singleton instance
let priceServiceInstance: PriceService | null = null;

export function getPriceService(): PriceService {
  if (!priceServiceInstance) {
    priceServiceInstance = new PriceService();
  }
  return priceServiceInstance;
}
