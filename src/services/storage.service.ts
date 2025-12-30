import { getPool } from '../db/database';
import { SupportedChain } from '../config/config';
import { NativeBalance, TokenBalance } from './blockchain.service';

export interface StoredWallet {
  id: number;
  address: string;
  label: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StoredBalance {
  id: number;
  wallet_id: number;
  chain: SupportedChain;
  token_address: string | null;
  token_symbol: string;
  balance_wei: string;
  balance_formatted: string;
  decimals: number;
  is_native: boolean;
  recorded_at: Date;
}

export interface StoredPrice {
  id: number;
  token_symbol: string;
  price_usd: string;
  recorded_at: Date;
}

export interface BalanceHistory {
  token_symbol: string;
  chain: SupportedChain;
  balance_formatted: string;
  recorded_at: Date;
}

export class StorageService {
  async getOrCreateWallet(address: string, label?: string): Promise<StoredWallet> {
    const pool = getPool();
    const normalizedAddress = address.toLowerCase();

    // Try to find existing wallet
    const existing = await pool.query<StoredWallet>(
      'SELECT * FROM wallets WHERE LOWER(address) = $1',
      [normalizedAddress]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new wallet
    const result = await pool.query<StoredWallet>(
      'INSERT INTO wallets (address, label) VALUES ($1, $2) RETURNING *',
      [address, label || null]
    );

    return result.rows[0];
  }

  async getWallet(address: string): Promise<StoredWallet | null> {
    const pool = getPool();
    const result = await pool.query<StoredWallet>(
      'SELECT * FROM wallets WHERE LOWER(address) = $1',
      [address.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  async saveNativeBalance(balance: NativeBalance): Promise<StoredBalance> {
    const pool = getPool();
    const wallet = await this.getOrCreateWallet(balance.address);

    const result = await pool.query<StoredBalance>(
      `INSERT INTO balances
       (wallet_id, chain, token_address, token_symbol, balance_wei, balance_formatted, decimals, is_native)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [
        wallet.id,
        balance.chain,
        balance.symbol,
        balance.balanceWei,
        balance.balanceFormatted,
        balance.decimals,
      ]
    );

    return result.rows[0];
  }

  async saveTokenBalance(balance: TokenBalance): Promise<StoredBalance> {
    const pool = getPool();
    const wallet = await this.getOrCreateWallet(balance.address);

    const result = await pool.query<StoredBalance>(
      `INSERT INTO balances
       (wallet_id, chain, token_address, token_symbol, balance_wei, balance_formatted, decimals, is_native)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING *`,
      [
        wallet.id,
        balance.chain,
        balance.tokenAddress,
        balance.tokenSymbol,
        balance.balanceWei,
        balance.balanceFormatted,
        balance.decimals,
      ]
    );

    return result.rows[0];
  }

  async saveMultipleBalances(
    nativeBalances: NativeBalance[],
    tokenBalances: TokenBalance[]
  ): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const balance of nativeBalances) {
        await this.saveNativeBalance(balance);
      }

      for (const balance of tokenBalances) {
        await this.saveTokenBalance(balance);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getBalanceHistory(
    address: string,
    options?: {
      chain?: SupportedChain;
      tokenSymbol?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<BalanceHistory[]> {
    const pool = getPool();
    const wallet = await this.getWallet(address);

    if (!wallet) {
      return [];
    }

    let query = `
      SELECT token_symbol, chain, balance_formatted, recorded_at
      FROM balances
      WHERE wallet_id = $1
    `;
    const params: (string | number)[] = [wallet.id];
    let paramIndex = 2;

    if (options?.chain) {
      query += ` AND chain = $${paramIndex}`;
      params.push(options.chain);
      paramIndex++;
    }

    if (options?.tokenSymbol) {
      query += ` AND token_symbol = $${paramIndex}`;
      params.push(options.tokenSymbol);
      paramIndex++;
    }

    query += ' ORDER BY recorded_at DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await pool.query<BalanceHistory>(query, params);
    return result.rows;
  }

  async getLatestBalances(address: string, chain?: SupportedChain): Promise<StoredBalance[]> {
    const pool = getPool();
    const wallet = await this.getWallet(address);

    if (!wallet) {
      return [];
    }

    let query = `
      SELECT DISTINCT ON (chain, token_symbol) *
      FROM balances
      WHERE wallet_id = $1
    `;
    const params: (string | number)[] = [wallet.id];

    if (chain) {
      query += ' AND chain = $2';
      params.push(chain);
    }

    query += ' ORDER BY chain, token_symbol, recorded_at DESC';

    const result = await pool.query<StoredBalance>(query, params);
    return result.rows;
  }

  async savePrice(tokenSymbol: string, priceUsd: number): Promise<StoredPrice> {
    const pool = getPool();
    const result = await pool.query<StoredPrice>(
      'INSERT INTO prices (token_symbol, price_usd) VALUES ($1, $2) RETURNING *',
      [tokenSymbol.toUpperCase(), priceUsd]
    );
    return result.rows[0];
  }

  async getLatestPrice(tokenSymbol: string): Promise<StoredPrice | null> {
    const pool = getPool();
    const result = await pool.query<StoredPrice>(
      'SELECT * FROM prices WHERE token_symbol = $1 ORDER BY recorded_at DESC LIMIT 1',
      [tokenSymbol.toUpperCase()]
    );
    return result.rows[0] || null;
  }

  async getLatestPrices(tokenSymbols: string[]): Promise<StoredPrice[]> {
    const pool = getPool();
    const result = await pool.query<StoredPrice>(
      `SELECT DISTINCT ON (token_symbol) *
       FROM prices
       WHERE token_symbol = ANY($1)
       ORDER BY token_symbol, recorded_at DESC`,
      [tokenSymbols.map((s) => s.toUpperCase())]
    );
    return result.rows;
  }
}

// Singleton instance
let storageServiceInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}
