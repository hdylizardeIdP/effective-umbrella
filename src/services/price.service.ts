import axios, { AxiosInstance } from 'axios';
import config from '../config/config';
import { ChainName } from './blockchain.service';
import { storageService } from './storage.service';

interface CoinGeckoPriceData {
  [coinId: string]: {
    usd: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
    usd_24h_change?: number;
  };
}

interface SimplePriceResponse {
  symbol: string;
  priceUsd: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
  priceChange24h?: number;
}

class PriceService {
  private client: AxiosInstance;
  private cache: Map<string, { price: number; timestamp: number }>;
  private cacheTTL: number = 60000; // 1 minute cache

  constructor() {
    // CoinGecko API configuration
    const baseURL = 'https://api.coingecko.com/api/v3';
    const headers: Record<string, string> = {};

    if (config.coinGecko.apiKey) {
      headers['x-cg-pro-api-key'] = config.coinGecko.apiKey;
    }

    this.client = axios.create({
      baseURL,
      headers,
      timeout: 10000,
    });

    this.cache = new Map();

    console.log('✓ Price service initialized');
  }

  /**
   * Get price from cache or fetch if expired
   */
  private getCachedPrice(key: string): number | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.price;
    }
    return null;
  }

  /**
   * Set price in cache
   */
  private setCachedPrice(key: string, price: number): void {
    this.cache.set(key, { price, timestamp: Date.now() });
  }

  /**
   * Get prices for multiple tokens using CoinGecko IDs
   * @param coinGeckoIds - Array of CoinGecko IDs
   * @returns Price data for each coin
   */
  async getPrices(coinGeckoIds: string[]): Promise<CoinGeckoPriceData> {
    try {
      const response = await this.client.get('/simple/price', {
        params: {
          ids: coinGeckoIds.join(','),
          vs_currencies: 'usd',
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching prices from CoinGecko:', error);
      throw new Error(`Failed to fetch prices: ${error}`);
    }
  }

  /**
   * Get price for a single token
   * @param coinGeckoId - CoinGecko ID (e.g., 'ethereum', 'usd-coin')
   * @param useCache - Whether to use cached price
   * @returns Price information
   */
  async getPrice(
    coinGeckoId: string,
    useCache: boolean = true
  ): Promise<SimplePriceResponse> {
    // Check cache first
    if (useCache) {
      const cachedPrice = this.getCachedPrice(coinGeckoId);
      if (cachedPrice !== null) {
        return {
          symbol: coinGeckoId,
          priceUsd: cachedPrice,
        };
      }
    }

    const priceData = await this.getPrices([coinGeckoId]);
    const data = priceData[coinGeckoId];

    if (!data) {
      throw new Error(`Price not found for ${coinGeckoId}`);
    }

    // Cache the price
    this.setCachedPrice(coinGeckoId, data.usd);

    return {
      symbol: coinGeckoId,
      priceUsd: data.usd,
      marketCapUsd: data.usd_market_cap,
      volume24hUsd: data.usd_24h_vol,
      priceChange24h: data.usd_24h_change,
    };
  }

  /**
   * Get prices for common native tokens
   */
  async getNativePrices(): Promise<{
    [key: string]: SimplePriceResponse;
  }> {
    const nativeTokens = {
      ETH: 'ethereum',
      MATIC: 'matic-network',
      ARB: 'arbitrum',
    };

    const coinGeckoIds = Object.values(nativeTokens);
    const priceData = await this.getPrices(coinGeckoIds);

    const results: { [key: string]: SimplePriceResponse } = {};

    for (const [symbol, coinGeckoId] of Object.entries(nativeTokens)) {
      const data = priceData[coinGeckoId];
      if (data) {
        results[symbol] = {
          symbol,
          priceUsd: data.usd,
          marketCapUsd: data.usd_market_cap,
          volume24hUsd: data.usd_24h_vol,
          priceChange24h: data.usd_24h_change,
        };

        // Cache the price
        this.setCachedPrice(coinGeckoId, data.usd);
      }
    }

    return results;
  }

  /**
   * Get prices for common stablecoins
   */
  async getStablecoinPrices(): Promise<{
    [key: string]: SimplePriceResponse;
  }> {
    const stablecoins = {
      USDC: 'usd-coin',
      USDT: 'tether',
      DAI: 'dai',
    };

    const coinGeckoIds = Object.values(stablecoins);
    const priceData = await this.getPrices(coinGeckoIds);

    const results: { [key: string]: SimplePriceResponse } = {};

    for (const [symbol, coinGeckoId] of Object.entries(stablecoins)) {
      const data = priceData[coinGeckoId];
      if (data) {
        results[symbol] = {
          symbol,
          priceUsd: data.usd,
          marketCapUsd: data.usd_market_cap,
          volume24hUsd: data.usd_24h_vol,
          priceChange24h: data.usd_24h_change,
        };

        // Cache the price
        this.setCachedPrice(coinGeckoId, data.usd);
      }
    }

    return results;
  }

  /**
   * Get price by token symbol (limited to known tokens)
   */
  async getPriceBySymbol(symbol: string): Promise<SimplePriceResponse> {
    const symbolToCoinGeckoId: { [key: string]: string } = {
      ETH: 'ethereum',
      MATIC: 'matic-network',
      ARB: 'arbitrum',
      USDC: 'usd-coin',
      USDT: 'tether',
      DAI: 'dai',
      WETH: 'weth',
      WBTC: 'wrapped-bitcoin',
      UNI: 'uniswap',
      LINK: 'chainlink',
      WMATIC: 'wmatic',
    };

    const coinGeckoId = symbolToCoinGeckoId[symbol.toUpperCase()];
    if (!coinGeckoId) {
      throw new Error(`CoinGecko ID not found for symbol: ${symbol}`);
    }

    return this.getPrice(coinGeckoId);
  }

  /**
   * Fetch and save prices to database
   * @param chain - Chain to save prices for
   * @param symbols - Array of token symbols
   */
  async fetchAndSavePrices(chain: ChainName, symbols: string[]): Promise<void> {
    const symbolToCoinGeckoId: { [key: string]: string } = {
      ETH: 'ethereum',
      MATIC: 'matic-network',
      ARB: 'arbitrum',
      USDC: 'usd-coin',
      USDT: 'tether',
      DAI: 'dai',
      WETH: 'weth',
      WBTC: 'wrapped-bitcoin',
      UNI: 'uniswap',
      LINK: 'chainlink',
      WMATIC: 'wmatic',
    };

    const coinGeckoIds = symbols
      .map((s) => symbolToCoinGeckoId[s.toUpperCase()])
      .filter((id) => id !== undefined);

    if (coinGeckoIds.length === 0) {
      console.warn('No valid CoinGecko IDs found for symbols:', symbols);
      return;
    }

    const priceData = await this.getPrices(coinGeckoIds);

    for (const [coinGeckoId, data] of Object.entries(priceData)) {
      const symbol = Object.keys(symbolToCoinGeckoId).find(
        (key) => symbolToCoinGeckoId[key] === coinGeckoId
      );

      if (symbol && data) {
        await storageService.savePrice(
          symbol,
          coinGeckoId,
          chain,
          data.usd,
          data.usd_market_cap,
          data.usd_24h_vol,
          data.usd_24h_change
        );

        console.log(`✓ Saved price for ${symbol}: $${data.usd}`);
      }
    }
  }

  /**
   * Calculate USD value
   * @param amount - Token amount (formatted, e.g., "1.5")
   * @param priceUsd - Price in USD
   * @returns USD value
   */
  calculateValue(amount: string, priceUsd: number): number {
    return parseFloat(amount) * priceUsd;
  }
}

// Export singleton instance
export const priceService = new PriceService();
