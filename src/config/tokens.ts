import { SupportedChain } from './config';

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  addresses: Partial<Record<SupportedChain, string>>;
}

// Popular tokens with their contract addresses across chains
export const TOKENS: Record<string, TokenInfo> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: {
      ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    },
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    addresses: {
      ethereum: '0x6B175474E89094C44Da98b954EesrD',
      polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      arbitrum: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    },
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    addresses: {
      ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    addresses: {
      ethereum: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      polygon: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      arbitrum: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    },
  },
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    addresses: {
      ethereum: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      polygon: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
      arbitrum: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    },
  },
  UNI: {
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    addresses: {
      ethereum: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      polygon: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
      arbitrum: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    },
  },
  AAVE: {
    symbol: 'AAVE',
    name: 'Aave',
    decimals: 18,
    addresses: {
      ethereum: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      polygon: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
      arbitrum: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
    },
  },
};

// Minimal ERC-20 ABI for balance checking
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export function getTokenAddress(symbol: string, chain: SupportedChain): string | null {
  const token = TOKENS[symbol.toUpperCase()];
  if (!token) return null;
  return token.addresses[chain] || null;
}

export function getTokenInfo(symbol: string): TokenInfo | null {
  return TOKENS[symbol.toUpperCase()] || null;
}

export function getAvailableTokens(chain: SupportedChain): TokenInfo[] {
  return Object.values(TOKENS).filter((token) => token.addresses[chain]);
}

export function getAllTokenSymbols(): string[] {
  return Object.keys(TOKENS);
}
