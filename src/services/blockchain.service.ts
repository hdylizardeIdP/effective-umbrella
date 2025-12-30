import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
import { config, SupportedChain, ChainConfig } from '../config/config';
import { isValidAddress } from '../utils/validation';
import { ERC20_ABI, getTokenAddress, getTokenInfo, getAvailableTokens, TokenInfo } from '../config/tokens';

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

export interface TokenBalance {
  address: string;
  chain: SupportedChain;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  balanceWei: string;
  balanceFormatted: string;
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

  async getTokenBalance(
    address: string,
    tokenAddress: string,
    chain: SupportedChain
  ): Promise<TokenBalance> {
    if (!isValidAddress(address)) {
      throw new Error(`Invalid wallet address: ${address}`);
    }
    if (!isValidAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    const provider = this.getProvider(chain);
    const contract = new Contract(tokenAddress, ERC20_ABI, provider);

    const [balanceWei, decimals, symbol, name] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
      contract.symbol(),
      contract.name(),
    ]);

    return {
      address,
      chain,
      tokenAddress,
      tokenSymbol: symbol,
      tokenName: name,
      balanceWei: balanceWei.toString(),
      balanceFormatted: formatUnits(balanceWei, decimals),
      decimals: Number(decimals),
    };
  }

  async getTokenBalanceBySymbol(
    address: string,
    tokenSymbol: string,
    chain: SupportedChain
  ): Promise<TokenBalance> {
    const tokenAddress = getTokenAddress(tokenSymbol, chain);
    if (!tokenAddress) {
      throw new Error(`Token ${tokenSymbol} not available on ${chain}`);
    }
    return this.getTokenBalance(address, tokenAddress, chain);
  }

  async getMultipleTokenBalances(
    address: string,
    tokenSymbols: string[],
    chain: SupportedChain
  ): Promise<TokenBalance[]> {
    if (!isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    const results = await Promise.allSettled(
      tokenSymbols.map((symbol) => this.getTokenBalanceBySymbol(address, symbol, chain))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<TokenBalance> => result.status === 'fulfilled')
      .map((result) => result.value);
  }

  async getAllTokenBalances(
    address: string,
    chain: SupportedChain
  ): Promise<TokenBalance[]> {
    const availableTokens = getAvailableTokens(chain);
    const symbols = availableTokens.map((t) => t.symbol);
    return this.getMultipleTokenBalances(address, symbols, chain);
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
