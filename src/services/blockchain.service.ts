import { JsonRpcProvider, formatEther, Contract, formatUnits } from 'ethers';
import config from '../config/config';
import { validateAndNormalizeAddress } from '../utils/validation';
import { TokenInfo, getTokenInfo, getChainTokens } from '../config/tokens';

// Minimal ERC-20 ABI for balance checking
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export type ChainName = 'ethereum' | 'polygon' | 'arbitrum';

interface ChainConfig {
  name: string;
  chainId: number;
  nativeToken: string;
  rpcUrl: string;
}

class BlockchainService {
  private providers: Map<ChainName, JsonRpcProvider>;
  private chainConfigs: Map<ChainName, ChainConfig>;

  constructor() {
    this.providers = new Map();
    this.chainConfigs = new Map([
      [
        'ethereum',
        {
          name: 'Ethereum Mainnet',
          chainId: 1,
          nativeToken: 'ETH',
          rpcUrl: config.rpcUrls.ethereum,
        },
      ],
      [
        'polygon',
        {
          name: 'Polygon Mainnet',
          chainId: 137,
          nativeToken: 'MATIC',
          rpcUrl: config.rpcUrls.polygon,
        },
      ],
      [
        'arbitrum',
        {
          name: 'Arbitrum One',
          chainId: 42161,
          nativeToken: 'ARB',
          rpcUrl: config.rpcUrls.arbitrum,
        },
      ],
    ]);

    this.initializeProviders();
  }

  private initializeProviders(): void {
    for (const [chain, chainConfig] of this.chainConfigs.entries()) {
      try {
        const provider = new JsonRpcProvider(chainConfig.rpcUrl);
        this.providers.set(chain, provider);
        console.log(`✓ Initialized ${chainConfig.name} provider`);
      } catch (error) {
        console.error(`✗ Failed to initialize ${chainConfig.name} provider:`, error);
        throw error;
      }
    }
  }

  public getProvider(chain: ChainName): JsonRpcProvider {
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`Provider not found for chain: ${chain}`);
    }
    return provider;
  }

  public getChainConfig(chain: ChainName): ChainConfig {
    const chainConfig = this.chainConfigs.get(chain);
    if (!chainConfig) {
      throw new Error(`Chain config not found for: ${chain}`);
    }
    return chainConfig;
  }

  public getSupportedChains(): ChainName[] {
    return Array.from(this.chainConfigs.keys());
  }

  public async testConnection(chain: ChainName): Promise<boolean> {
    try {
      const provider = this.getProvider(chain);
      const blockNumber = await provider.getBlockNumber();
      const network = await provider.getNetwork();

      const chainConfig = this.getChainConfig(chain);
      if (Number(network.chainId) !== chainConfig.chainId) {
        console.error(
          `Chain ID mismatch for ${chain}: expected ${chainConfig.chainId}, got ${network.chainId}`
        );
        return false;
      }

      console.log(
        `✓ ${chainConfig.name} connection successful - Block: ${blockNumber}, Chain ID: ${network.chainId}`
      );
      return true;
    } catch (error) {
      console.error(`✗ Connection test failed for ${chain}:`, error);
      return false;
    }
  }

  public async testAllConnections(): Promise<{ [key in ChainName]: boolean }> {
    const results: { [key in ChainName]?: boolean } = {};

    for (const chain of this.getSupportedChains()) {
      results[chain] = await this.testConnection(chain);
    }

    return results as { [key in ChainName]: boolean };
  }

  /**
   * Get native token balance (ETH, MATIC, ARB) for an address
   * @param address - Ethereum address to check
   * @param chain - Chain to query
   * @returns Balance in wei (bigint)
   */
  public async getNativeBalance(address: string, chain: ChainName): Promise<bigint> {
    try {
      const normalizedAddress = validateAndNormalizeAddress(address);
      const provider = this.getProvider(chain);
      const balance = await provider.getBalance(normalizedAddress);
      return balance;
    } catch (error) {
      const chainConfig = this.getChainConfig(chain);
      throw new Error(
        `Failed to get native balance for ${address} on ${chainConfig.name}: ${error}`
      );
    }
  }

  /**
   * Get native token balance formatted as a decimal string
   * @param address - Ethereum address to check
   * @param chain - Chain to query
   * @returns Balance formatted as string (e.g., "1.234")
   */
  public async getNativeBalanceFormatted(
    address: string,
    chain: ChainName
  ): Promise<string> {
    const balance = await this.getNativeBalance(address, chain);
    return formatEther(balance);
  }

  /**
   * Get native balances across all supported chains
   * @param address - Ethereum address to check
   * @returns Object with balances for each chain
   */
  public async getAllNativeBalances(address: string): Promise<{
    [key in ChainName]: {
      balance: bigint;
      formatted: string;
      token: string;
    };
  }> {
    const normalizedAddress = validateAndNormalizeAddress(address);
    const results: any = {};

    for (const chain of this.getSupportedChains()) {
      try {
        const balance = await this.getNativeBalance(normalizedAddress, chain);
        const chainConfig = this.getChainConfig(chain);
        results[chain] = {
          balance,
          formatted: formatEther(balance),
          token: chainConfig.nativeToken,
        };
      } catch (error) {
        console.error(`Failed to get balance for ${chain}:`, error);
        results[chain] = {
          balance: BigInt(0),
          formatted: '0.0',
          token: this.getChainConfig(chain).nativeToken,
          error: String(error),
        };
      }
    }

    return results;
  }

  /**
   * Get ERC-20 token balance for an address
   * @param address - Wallet address to check
   * @param tokenAddress - Token contract address
   * @param chain - Chain to query
   * @returns Balance in smallest unit (e.g., wei for 18 decimals)
   */
  public async getTokenBalance(
    address: string,
    tokenAddress: string,
    chain: ChainName
  ): Promise<bigint> {
    try {
      const normalizedAddress = validateAndNormalizeAddress(address);
      const normalizedTokenAddress = validateAndNormalizeAddress(tokenAddress);
      const provider = this.getProvider(chain);

      const tokenContract = new Contract(normalizedTokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(normalizedAddress);

      return balance;
    } catch (error) {
      throw new Error(
        `Failed to get token balance for ${address} on ${chain}: ${error}`
      );
    }
  }

  /**
   * Get ERC-20 token balance formatted with decimals
   * @param address - Wallet address to check
   * @param tokenAddress - Token contract address
   * @param decimals - Token decimals
   * @param chain - Chain to query
   * @returns Formatted balance as string
   */
  public async getTokenBalanceFormatted(
    address: string,
    tokenAddress: string,
    decimals: number,
    chain: ChainName
  ): Promise<string> {
    const balance = await this.getTokenBalance(address, tokenAddress, chain);
    return formatUnits(balance, decimals);
  }

  /**
   * Get token info from contract (symbol, name, decimals)
   * @param tokenAddress - Token contract address
   * @param chain - Chain to query
   * @returns Token information
   */
  public async getTokenInfo(
    tokenAddress: string,
    chain: ChainName
  ): Promise<{
    symbol: string;
    name: string;
    decimals: number;
  }> {
    try {
      const normalizedTokenAddress = validateAndNormalizeAddress(tokenAddress);
      const provider = this.getProvider(chain);
      const tokenContract = new Contract(normalizedTokenAddress, ERC20_ABI, provider);

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
      ]);

      return {
        symbol,
        name,
        decimals: Number(decimals),
      };
    } catch (error) {
      throw new Error(`Failed to get token info for ${tokenAddress} on ${chain}: ${error}`);
    }
  }

  /**
   * Get balance for a specific token by symbol (from config)
   * @param address - Wallet address
   * @param tokenSymbol - Token symbol (e.g., 'USDC')
   * @param chain - Chain to query
   * @returns Token balance info
   */
  public async getTokenBalanceBySymbol(
    address: string,
    tokenSymbol: string,
    chain: ChainName
  ): Promise<{
    symbol: string;
    balance: bigint;
    formatted: string;
    decimals: number;
  }> {
    const tokenInfo = getTokenInfo(chain, tokenSymbol);
    if (!tokenInfo) {
      throw new Error(`Token ${tokenSymbol} not found in config for ${chain}`);
    }

    const balance = await this.getTokenBalance(address, tokenInfo.address, chain);

    return {
      symbol: tokenInfo.symbol,
      balance,
      formatted: formatUnits(balance, tokenInfo.decimals),
      decimals: tokenInfo.decimals,
    };
  }

  /**
   * Get balances for all configured tokens on a chain
   * @param address - Wallet address
   * @param chain - Chain to query
   * @returns Array of token balance info
   */
  public async getAllTokenBalances(
    address: string,
    chain: ChainName
  ): Promise<
    Array<{
      symbol: string;
      name: string;
      balance: bigint;
      formatted: string;
      decimals: number;
      address: string;
    }>
  > {
    const normalizedAddress = validateAndNormalizeAddress(address);
    const tokens = getChainTokens(chain);
    const results = [];

    for (const token of tokens) {
      try {
        const balance = await this.getTokenBalance(
          normalizedAddress,
          token.address,
          chain
        );
        results.push({
          symbol: token.symbol,
          name: token.name,
          balance,
          formatted: formatUnits(balance, token.decimals),
          decimals: token.decimals,
          address: token.address,
        });
      } catch (error) {
        console.error(`Failed to get balance for ${token.symbol} on ${chain}:`, error);
        results.push({
          symbol: token.symbol,
          name: token.name,
          balance: BigInt(0),
          formatted: '0.0',
          decimals: token.decimals,
          address: token.address,
        });
      }
    }

    return results;
  }

  /**
   * Get all balances (native + tokens) for an address on a specific chain using batch queries
   * This is more efficient than calling individual methods
   * @param address - Wallet address
   * @param chain - Chain to query
   * @returns Complete balance information
   */
  public async getAllBalances(address: string, chain: ChainName): Promise<{
    native: {
      symbol: string;
      balance: bigint;
      formatted: string;
    };
    tokens: Array<{
      symbol: string;
      name: string;
      balance: bigint;
      formatted: string;
      decimals: number;
      address: string;
    }>;
  }> {
    const normalizedAddress = validateAndNormalizeAddress(address);
    const chainConfig = this.getChainConfig(chain);

    // Batch: Get native balance and all token balances in parallel
    const [nativeBalance, tokenBalances] = await Promise.all([
      this.getNativeBalance(normalizedAddress, chain),
      this.getAllTokenBalances(normalizedAddress, chain),
    ]);

    return {
      native: {
        symbol: chainConfig.nativeToken,
        balance: nativeBalance,
        formatted: formatEther(nativeBalance),
      },
      tokens: tokenBalances,
    };
  }

  /**
   * Get complete portfolio across all chains with batch optimization
   * @param address - Wallet address
   * @returns Portfolio data for all chains
   */
  public async getCompletePortfolio(address: string): Promise<{
    [key in ChainName]: {
      native: {
        symbol: string;
        balance: bigint;
        formatted: string;
      };
      tokens: Array<{
        symbol: string;
        name: string;
        balance: bigint;
        formatted: string;
        decimals: number;
        address: string;
      }>;
    };
  }> {
    const normalizedAddress = validateAndNormalizeAddress(address);
    const chains = this.getSupportedChains();

    // Batch: Query all chains in parallel
    const results = await Promise.all(
      chains.map((chain) => this.getAllBalances(normalizedAddress, chain))
    );

    // Map results to chain names
    const portfolio: any = {};
    chains.forEach((chain, index) => {
      portfolio[chain] = results[index];
    });

    return portfolio;
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
