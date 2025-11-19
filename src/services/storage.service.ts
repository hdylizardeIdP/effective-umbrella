import { Pool, PoolClient } from 'pg';
import config from '../config/config';
import { ChainName } from './blockchain.service';

interface WalletRecord {
  id: string;
  address: string;
  label?: string;
  created_at: Date;
  updated_at: Date;
}

interface BalanceRecord {
  id: string;
  wallet_id: string;
  chain: string;
  token_type: 'native' | 'erc20';
  token_address?: string;
  token_symbol: string;
  token_name?: string;
  decimals: number;
  balance: string;
  balance_formatted: string;
  timestamp: Date;
  block_number?: number;
}

interface PriceRecord {
  id: string;
  token_symbol: string;
  coingecko_id: string;
  chain: string;
  price_usd: number;
  market_cap_usd?: number;
  volume_24h_usd?: number;
  price_change_24h?: number;
  timestamp: Date;
}

class StorageService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
    });

    // Test connection on initialization
    this.pool.on('connect', () => {
      console.log('✓ Database pool connected');
    });

    this.pool.on('error', (err) => {
      console.error('✗ Unexpected database error:', err);
    });
  }

  /**
   * Get or create a wallet record
   */
  async getOrCreateWallet(address: string, label?: string): Promise<WalletRecord> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<WalletRecord>(
        `INSERT INTO wallets (address, label)
         VALUES ($1, $2)
         ON CONFLICT (address) DO UPDATE SET label = COALESCE($2, wallets.label)
         RETURNING *`,
        [address.toLowerCase(), label]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Save native token balance
   */
  async saveNativeBalance(
    walletAddress: string,
    chain: ChainName,
    tokenSymbol: string,
    balance: bigint,
    balanceFormatted: string,
    blockNumber?: number
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      const wallet = await this.getOrCreateWallet(walletAddress);

      await client.query(
        `INSERT INTO balances (wallet_id, chain, token_type, token_symbol, decimals, balance, balance_formatted, block_number)
         VALUES ($1, $2, 'native', $3, 18, $4, $5, $6)`,
        [wallet.id, chain, tokenSymbol, balance.toString(), balanceFormatted, blockNumber]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Save ERC-20 token balance
   */
  async saveTokenBalance(
    walletAddress: string,
    chain: ChainName,
    tokenAddress: string,
    tokenSymbol: string,
    tokenName: string,
    decimals: number,
    balance: bigint,
    balanceFormatted: string,
    blockNumber?: number
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      const wallet = await this.getOrCreateWallet(walletAddress);

      await client.query(
        `INSERT INTO balances (wallet_id, chain, token_type, token_address, token_symbol, token_name, decimals, balance, balance_formatted, block_number)
         VALUES ($1, $2, 'erc20', $3, $4, $5, $6, $7, $8, $9)`,
        [
          wallet.id,
          chain,
          tokenAddress.toLowerCase(),
          tokenSymbol,
          tokenName,
          decimals,
          balance.toString(),
          balanceFormatted,
          blockNumber,
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Save multiple balances at once (batch operation)
   */
  async saveBatchBalances(
    walletAddress: string,
    chain: ChainName,
    balances: Array<{
      tokenType: 'native' | 'erc20';
      tokenAddress?: string;
      tokenSymbol: string;
      tokenName?: string;
      decimals: number;
      balance: bigint;
      balanceFormatted: string;
    }>
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wallet = await this.getOrCreateWallet(walletAddress);

      for (const bal of balances) {
        await client.query(
          `INSERT INTO balances (wallet_id, chain, token_type, token_address, token_symbol, token_name, decimals, balance, balance_formatted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            wallet.id,
            chain,
            bal.tokenType,
            bal.tokenAddress?.toLowerCase() || null,
            bal.tokenSymbol,
            bal.tokenName || null,
            bal.decimals,
            bal.balance.toString(),
            bal.balanceFormatted,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save price data
   */
  async savePrice(
    tokenSymbol: string,
    coingeckoId: string,
    chain: ChainName,
    priceUsd: number,
    marketCapUsd?: number,
    volume24hUsd?: number,
    priceChange24h?: number
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO prices (token_symbol, coingecko_id, chain, price_usd, market_cap_usd, volume_24h_usd, price_change_24h)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tokenSymbol, coingeckoId, chain, priceUsd, marketCapUsd, volume24hUsd, priceChange24h]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get latest balance for a wallet/chain/token
   */
  async getLatestBalance(
    walletAddress: string,
    chain: ChainName,
    tokenSymbol: string
  ): Promise<BalanceRecord | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<BalanceRecord>(
        `SELECT b.*
         FROM balances b
         JOIN wallets w ON w.id = b.wallet_id
         WHERE w.address = $1 AND b.chain = $2 AND b.token_symbol = $3
         ORDER BY b.timestamp DESC
         LIMIT 1`,
        [walletAddress.toLowerCase(), chain, tokenSymbol]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get balance history for a wallet/chain/token
   */
  async getBalanceHistory(
    walletAddress: string,
    chain: ChainName,
    tokenSymbol: string,
    limit: number = 100
  ): Promise<BalanceRecord[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<BalanceRecord>(
        `SELECT b.*
         FROM balances b
         JOIN wallets w ON w.id = b.wallet_id
         WHERE w.address = $1 AND b.chain = $2 AND b.token_symbol = $3
         ORDER BY b.timestamp DESC
         LIMIT $4`,
        [walletAddress.toLowerCase(), chain, tokenSymbol, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get latest price for a token
   */
  async getLatestPrice(tokenSymbol: string, chain: ChainName): Promise<PriceRecord | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<PriceRecord>(
        `SELECT * FROM prices
         WHERE token_symbol = $1 AND chain = $2
         ORDER BY timestamp DESC
         LIMIT 1`,
        [tokenSymbol, chain]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Save portfolio snapshot
   */
  async savePortfolioSnapshot(
    walletAddress: string,
    totalValueUsd: number,
    chainBreakdown: Record<string, number>,
    tokenBreakdown: Record<string, number>
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      const wallet = await this.getOrCreateWallet(walletAddress);

      await client.query(
        `INSERT INTO portfolio_snapshots (wallet_id, total_value_usd, chain_breakdown, token_breakdown)
         VALUES ($1, $2, $3, $4)`,
        [wallet.id, totalValueUsd, JSON.stringify(chainBreakdown), JSON.stringify(tokenBreakdown)]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get portfolio history
   */
  async getPortfolioHistory(walletAddress: string, limit: number = 30): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT ps.*
         FROM portfolio_snapshots ps
         JOIN wallets w ON w.id = ps.wallet_id
         WHERE w.address = $1
         ORDER BY ps.timestamp DESC
         LIMIT $2`,
        [walletAddress.toLowerCase(), limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Close database pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('✓ Database pool closed');
  }
}

// Export singleton instance
export const storageService = new StorageService();
