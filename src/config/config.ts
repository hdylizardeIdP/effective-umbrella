import dotenv from 'dotenv';

dotenv.config();

export type SupportedChain = 'ethereum' | 'polygon' | 'arbitrum';

export interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface Config {
  port: number;
  chains: Record<SupportedChain, ChainConfig>;
  databaseUrl: string;
  coingeckoApiKey: string | undefined;
}

function getEnvVar(name: string, required: boolean = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    chains: {
      ethereum: {
        name: 'Ethereum Mainnet',
        rpcUrl: getEnvVar('RPC_URL_ETH'),
        chainId: 1,
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      },
      polygon: {
        name: 'Polygon Mainnet',
        rpcUrl: getEnvVar('RPC_URL_POLYGON'),
        chainId: 137,
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18,
        },
      },
      arbitrum: {
        name: 'Arbitrum One',
        rpcUrl: getEnvVar('RPC_URL_ARBITRUM'),
        chainId: 42161,
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      },
    },
    databaseUrl: getEnvVar('DATABASE_URL', false),
    coingeckoApiKey: process.env.COINGECKO_API_KEY,
  };
}

export const config = loadConfig();

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check RPC URLs are valid URLs
  for (const [chain, chainConfig] of Object.entries(config.chains)) {
    try {
      new URL(chainConfig.rpcUrl);
    } catch {
      errors.push(`Invalid RPC URL for ${chain}: ${chainConfig.rpcUrl}`);
    }
  }

  // Check database URL if provided
  if (config.databaseUrl) {
    try {
      new URL(config.databaseUrl);
    } catch {
      errors.push(`Invalid DATABASE_URL: ${config.databaseUrl}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
