import { JsonRpcProvider, formatUnits } from 'ethers';
import { config, SupportedChain, ChainConfig } from '../config/config';
import { isValidAddress } from '../utils/validation';

export interface ConnectionStatus {
  chain: SupportedChain;
  connected: boolean;
  blockNumber?: number;
  error?: string;
}

export interface NativeBalance {
  address: string;
  chain: SupportedChain;
  balanceWei: string;
  balanceFormatted: string;
  symbol: string;
  decimals: number;
}

export class BlockchainService {
  private providers: Map<SupportedChain, JsonRpcProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const chains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum'];

    for (const chain of chains) {
      const chainConfig = config.chains[chain];
      try {
        const provider = new JsonRpcProvider(chainConfig.rpcUrl, {
          name: chainConfig.name,
          chainId: chainConfig.chainId,
        });
        this.providers.set(chain, provider);
      } catch (error) {
        console.error(`Failed to initialize provider for ${chain}:`, error);
      }
    }
  }

  getProvider(chain: SupportedChain): JsonRpcProvider {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`Provider not initialized for chain: ${chain}`);
    }
    return provider;
  }

  getChainConfig(chain: SupportedChain): ChainConfig {
    return config.chains[chain];
  }

  getSupportedChains(): SupportedChain[] {
    return Array.from(this.providers.keys());
  }

  async testConnection(chain: SupportedChain): Promise<ConnectionStatus> {
    try {
      const provider = this.getProvider(chain);
      const blockNumber = await provider.getBlockNumber();
      return {
        chain,
        connected: true,
        blockNumber,
      };
    } catch (error) {
      return {
        chain,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testAllConnections(): Promise<ConnectionStatus[]> {
    const chains = this.getSupportedChains();
    const results = await Promise.all(
      chains.map((chain) => this.testConnection(chain))
    );
    return results;
  }

  async getNativeBalance(address: string, chain: SupportedChain): Promise<NativeBalance> {
    if (!isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    const provider = this.getProvider(chain);
    const chainConfig = this.getChainConfig(chain);
    const balanceWei = await provider.getBalance(address);

    return {
      address,
      chain,
      balanceWei: balanceWei.toString(),
      balanceFormatted: formatUnits(balanceWei, chainConfig.nativeCurrency.decimals),
      symbol: chainConfig.nativeCurrency.symbol,
      decimals: chainConfig.nativeCurrency.decimals,
    };
  }

  async getNativeBalanceAllChains(address: string): Promise<NativeBalance[]> {
    if (!isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    const chains = this.getSupportedChains();
    const results = await Promise.allSettled(
      chains.map((chain) => this.getNativeBalance(address, chain))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<NativeBalance> => result.status === 'fulfilled')
      .map((result) => result.value);
  }
}

// Singleton instance
let blockchainServiceInstance: BlockchainService | null = null;

export function getBlockchainService(): BlockchainService {
  if (!blockchainServiceInstance) {
    blockchainServiceInstance = new BlockchainService();
  }
  return blockchainServiceInstance;
}
