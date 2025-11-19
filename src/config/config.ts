import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  rpcUrls: {
    ethereum: string;
    polygon: string;
    arbitrum: string;
  };
  database: {
    url: string;
  };
  coinGecko: {
    apiKey?: string;
  };
  rateLimits: {
    maxRequestsPerMinute: number;
  };
}

class ConfigValidator {
  private static validateRequired(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  private static validateUrl(value: string | undefined, name: string): string {
    const url = this.validateRequired(value, name);
    try {
      new URL(url);
      return url;
    } catch (error) {
      throw new Error(`Invalid URL for ${name}: ${url}`);
    }
  }

  public static validate(): Config {
    return {
      port: parseInt(process.env.PORT || '3000', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      rpcUrls: {
        ethereum: this.validateUrl(process.env.RPC_URL_ETH, 'RPC_URL_ETH'),
        polygon: this.validateUrl(process.env.RPC_URL_POLYGON, 'RPC_URL_POLYGON'),
        arbitrum: this.validateUrl(process.env.RPC_URL_ARBITRUM, 'RPC_URL_ARBITRUM'),
      },
      database: {
        url: this.validateRequired(process.env.DATABASE_URL, 'DATABASE_URL'),
      },
      coinGecko: {
        apiKey: process.env.COINGECKO_API_KEY,
      },
      rateLimits: {
        maxRequestsPerMinute: parseInt(
          process.env.MAX_REQUESTS_PER_MINUTE || '30',
          10
        ),
      },
    };
  }
}

let config: Config;

try {
  config = ConfigValidator.validate();
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}

export default config;
