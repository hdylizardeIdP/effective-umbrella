import { isAddress, getAddress } from 'ethers';

/**
 * Validates if a given string is a valid Ethereum address
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  try {
    return isAddress(address);
  } catch (error) {
    return false;
  }
}

/**
 * Validates and returns the checksummed address
 * @param address - The address to validate and normalize
 * @returns The checksummed address
 * @throws Error if the address is invalid
 */
export function validateAndNormalizeAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  return getAddress(address);
}

/**
 * Validates multiple addresses
 * @param addresses - Array of addresses to validate
 * @returns Object with valid and invalid addresses
 */
export function validateMultipleAddresses(addresses: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const address of addresses) {
    if (isValidAddress(address)) {
      valid.push(getAddress(address));
    } else {
      invalid.push(address);
    }
  }

  return { valid, invalid };
}

/**
 * Checks if an address is the zero address
 * @param address - The address to check
 * @returns true if it's the zero address
 */
export function isZeroAddress(address: string): boolean {
  return address === '0x0000000000000000000000000000000000000000';
}
