/**
 * contractErrors.ts
 *
 * Parses wagmi / viem contract revert errors into human-readable messages
 * that are contextually accurate for each specific error type.
 */

// ─── Known contract error selectors ────────────────────────────────────────
// keccak256("ErrorName()").slice(0, 10)
// Pre-computed for every custom error in Bruma.sol
export const ERROR_SELECTORS: Record<string, string> = {
  '0x7c946ed7': 'InvalidDates',
  '0xb4fa3fb3': 'InsufficientPremium',
  '0x8b93e244': 'VaultCannotUnderwrite',
  '0xf6c9e0b5': 'OptionNotExpired',
  '0x2f6f0e73': 'InvalidOptionStatus',
  '0xc33d9d0b': 'SettlementNotRequested',
  '0x99ec73e4': 'OracleNotFulfilled',
  '0x4934d41e': 'InvalidSpread',
  '0x55d417ee': 'InvalidNotional',
  '0x62c08ea8': 'VaultNotSet',
  '0x97f2cb20': 'QuoteNotFulfilled',
  '0xa68e4491': 'NotYourQuote',
  '0x6a3c7b8e': 'QuoteExpired',
  '0x28be3fd0': 'InvalidPremium',
  '0xd5b3930d': 'FeeTooHigh',
  '0xa61e4da0': 'TransferLocked',
  '0x9e6b6e55': 'NoPendingPayout',
  '0x1e2b3f82': 'PremiumBelowMinimum',
  '0x7c5dd4c2': 'NotionalBelowMinimum',
};

// ─── Human-readable messages ─────────────────────────────────────────────────
export const ERROR_MESSAGES: Record<string, { title: string; detail: string }> = {
  InvalidDates: {
    title: 'Invalid coverage dates',
    detail:
      'The start date must be in the future and the expiry must be after the start date. ' +
      'Options require at least a future start date — you cannot use past dates.',
  },
  InsufficientPremium: {
    title: 'Payment too low',
    detail:
      'The ETH sent does not cover the quoted premium plus the protocol fee. ' +
      'Please use the exact amount shown in the quote.',
  },
  VaultCannotUnderwrite: {
    title: 'Insufficient vault liquidity',
    detail:
      'The liquidity vault does not have enough funds to back this option\'s maximum payout. ' +
      'Try a smaller notional or spread, or try again later.',
  },
  OptionNotExpired: {
    title: 'Option has not expired yet',
    detail: 'Settlement can only be requested after the option\'s expiry date has passed.',
  },
  InvalidOptionStatus: {
    title: 'Wrong option state',
    detail:
      'This action cannot be performed because the option is not in the expected state. ' +
      'For example, you can only finalize settlement after requesting it.',
  },
  SettlementNotRequested: {
    title: 'Settlement not yet requested',
    detail: 'You must call "Request settlement" (step 1) before finalizing (step 2).',
  },
  OracleNotFulfilled: {
    title: 'Rainfall data not ready',
    detail:
      'The Chainlink oracle has not yet returned the rainfall measurement. ' +
      'Please wait a few minutes and try "Finalize settlement" again.',
  },
  InvalidSpread: {
    title: 'Invalid spread',
    detail: 'Spread must be greater than zero millimeters.',
  },
  InvalidNotional: {
    title: 'Invalid notional',
    detail: 'Notional must be greater than zero.',
  },
  VaultNotSet: {
    title: 'Vault not configured',
    detail: 'The protocol vault address has not been set. Please contact the team.',
  },
  QuoteNotFulfilled: {
    title: 'Premium quote not ready',
    detail:
      'The Chainlink oracle has not yet calculated your premium. ' +
      'Please wait a moment and try creating your option again.',
  },
  NotYourQuote: {
    title: 'Quote belongs to another wallet',
    detail:
      'This premium quote was requested by a different address. ' +
      'Each quote can only be used by the wallet that requested it.',
  },
  QuoteExpired: {
    title: 'Premium quote expired',
    detail:
      'Premium quotes are valid for 1 hour. This quote has expired — ' +
      'please request a new one.',
  },
  InvalidPremium: {
    title: 'Zero premium returned',
    detail:
      'The oracle returned a premium of zero for this option. ' +
      'This can happen for very short durations or unusual strike/spread combinations. ' +
      'Try adjusting your parameters.',
  },
  FeeTooHigh: {
    title: 'Fee exceeds maximum',
    detail: 'Protocol fee cannot exceed 10% (1000 basis points).',
  },
  TransferLocked: {
    title: 'Transfer locked during settlement',
    detail:
      'This option cannot be transferred while settlement is in progress. ' +
      'Once settlement is finalized the NFT will be transferable again.',
  },
  NoPendingPayout: {
    title: 'No payout to claim',
    detail:
      'There is no pending payout for this option. ' +
      'Either the option did not pay out, or the payout has already been claimed.',
  },
  PremiumBelowMinimum: {
    title: 'Premium below minimum',
    detail:
      'The calculated premium is below the protocol minimum of 0.05 ETH. ' +
      'This usually means the option duration is too short (under ~3 days) or the notional is too small. ' +
      'Try a longer coverage period or a larger notional amount.',
  },
  NotionalBelowMinimum: {
    title: 'Notional too small',
    detail:
      'The notional amount per millimeter must be at least 0.01 ETH. ' +
      'Please increase your notional.',
  },
};

// ─── Fallback parser ──────────────────────────────────────────────────────────
function extractErrorName(error: unknown): string | null {
  const str = String(error);

  // 1. viem ContractFunctionRevertedError with a named reason
  const namedMatch = str.match(/The contract function .+? reverted with the following reason:\s*(\w+)/);
  if (namedMatch) return namedMatch[1];

  // 2. error name field on the error object
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;

    // viem shapes the error differently depending on the version
    const candidates = [
      e?.cause,
      (e?.cause as Record<string, unknown>)?.cause,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object') {
        const c = candidate as Record<string, unknown>;
        if (typeof c.errorName === 'string') return c.errorName;
        if (typeof c.reason === 'string') return c.reason;
      }
    }

    if (typeof e.errorName === 'string') return e.errorName;
    if (typeof e.reason === 'string') return e.reason;

    // 3. 4-byte selector lookup in raw data
    const data =
      (e?.data as string) ||
      ((e?.cause as Record<string, unknown>)?.data as string) ||
      '';

    if (typeof data === 'string' && data.length >= 10) {
      const selector = data.slice(0, 10).toLowerCase();
      const name = ERROR_SELECTORS[selector];
      if (name) return name;
    }
  }

  // 4. Regex scan of the full error string for any known error name
  for (const name of Object.keys(ERROR_MESSAGES)) {
    if (str.includes(name)) return name;
  }

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ParsedContractError {
  /** Short title suitable for a toast/alert heading */
  title: string;
  /** Detailed explanation of what went wrong and how to fix it */
  detail: string;
  /** The raw error name from the contract, if identified */
  errorName: string | null;
}

/**
 * Parse any wagmi/viem error into a user-friendly message.
 * Falls back to a generic message if the error cannot be identified.
 */
export function parseContractError(error: unknown): ParsedContractError {
  // User rejected the wallet prompt — not really an error
  const str = String(error);
  if (str.includes('User rejected') || str.includes('user rejected') || str.includes('4001')) {
    return {
      title: 'Transaction cancelled',
      detail: 'You rejected the transaction in your wallet.',
      errorName: 'UserRejected',
    };
  }

  const errorName = extractErrorName(error);

  if (errorName && ERROR_MESSAGES[errorName]) {
    return { ...ERROR_MESSAGES[errorName], errorName };
  }

  // Generic fallback
  return {
    title: 'Transaction failed',
    detail:
      errorName
        ? `Contract reverted with: ${errorName}`
        : 'An unexpected error occurred. Check the browser console for details.',
    errorName,
  };
}