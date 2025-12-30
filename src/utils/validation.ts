import { isAddress, getAddress } from 'ethers';

/**
 * Validates if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Returns a checksummed address if valid, throws if invalid
 */
export function toChecksumAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  return getAddress(address);
}

/**
 * Validates and returns checksummed address, or null if invalid
 */
export function normalizeAddress(address: string): string | null {
  try {
    return toChecksumAddress(address);
  } catch {
    return null;
  }
}
