import { ChainName } from '../services/blockchain.service';

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  coingeckoId: string;
}

export type TokenMap = {
  [key in ChainName]: {
    [symbol: string]: TokenInfo;
  };
};

/**
 * Popular token addresses across supported chains
 * Add or update tokens as needed
 */
export const TOKENS: TokenMap = {
  ethereum: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      coingeckoId: 'usd-coin',
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      coingeckoId: 'tether',
    },
    DAI: {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      coingeckoId: 'dai',
    },
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      coingeckoId: 'weth',
    },
    WBTC: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      decimals: 8,
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      coingeckoId: 'wrapped-bitcoin',
    },
    UNI: {
      symbol: 'UNI',
      name: 'Uniswap',
      decimals: 18,
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      coingeckoId: 'uniswap',
    },
    LINK: {
      symbol: 'LINK',
      name: 'ChainLink Token',
      decimals: 18,
      address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      coingeckoId: 'chainlink',
    },
  },
  polygon: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      coingeckoId: 'usd-coin',
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      coingeckoId: 'tether',
    },
    DAI: {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      coingeckoId: 'dai',
    },
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      coingeckoId: 'weth',
    },
    WBTC: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      decimals: 8,
      address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      coingeckoId: 'wrapped-bitcoin',
    },
    WMATIC: {
      symbol: 'WMATIC',
      name: 'Wrapped Matic',
      decimals: 18,
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      coingeckoId: 'wmatic',
    },
  },
  arbitrum: {
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      coingeckoId: 'usd-coin',
    },
    'USDC.e': {
      symbol: 'USDC.e',
      name: 'Bridged USDC',
      decimals: 6,
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      coingeckoId: 'usd-coin',
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      coingeckoId: 'tether',
    },
    DAI: {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      coingeckoId: 'dai',
    },
    WETH: {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      coingeckoId: 'weth',
    },
    WBTC: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      decimals: 8,
      address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      coingeckoId: 'wrapped-bitcoin',
    },
    ARB: {
      symbol: 'ARB',
      name: 'Arbitrum',
      decimals: 18,
      address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      coingeckoId: 'arbitrum',
    },
  },
};

/**
 * Get token info by symbol and chain
 */
export function getTokenInfo(
  chain: ChainName,
  symbol: string
): TokenInfo | undefined {
  return TOKENS[chain][symbol];
}

/**
 * Get all tokens for a specific chain
 */
export function getChainTokens(chain: ChainName): TokenInfo[] {
  return Object.values(TOKENS[chain]);
}

/**
 * Get all supported token symbols for a chain
 */
export function getChainTokenSymbols(chain: ChainName): string[] {
  return Object.keys(TOKENS[chain]);
}

/**
 * Check if a token symbol is supported on a chain
 */
export function isTokenSupported(chain: ChainName, symbol: string): boolean {
  return symbol in TOKENS[chain];
}
