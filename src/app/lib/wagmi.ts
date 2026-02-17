import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';

// Create config function to avoid SSR issues
export function getConfig() {
  return getDefaultConfig({
    appName: 'Weather Options',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [sepolia, mainnet],
    ssr: false, // Disable SSR to avoid indexedDB errors
  });
}

// Contract configuration for Weather Options V3
// Sepolia Testnet Deployment
export const CONTRACTS = {
  // Weather Option V3 (Main contract)
  WEATHER_OPTION: '0x3C97d44c502488AcF0Dfda5c691be3A264D84CE0' as const,
  
  // Vault (Liquidity provider contract)
  VAULT: '0x8E333D07F74FF9A45b0E3E0805a10d58fb61E72C' as const,
  
  // WETH (Wrapped ETH)
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as const,
  
  // Premium Calculator (Chainlink Functions oracle)
  PREMIUM_CONSUMER: '0xEB36260fc0647D9ca4b67F40E1310697074897d4' as const,
  PREMIUM_COORDINATOR: '0xf322B700c27a8C527F058f48481877855bD84F6e' as const,
  
  // Rainfall Oracle (Chainlink Functions oracle for settlement)
  RAINFALL_CONSUMER: '0x96722110DE16F18d3FF21E070F2251cbf8376f92' as const,
  RAINFALL_COORDINATOR: '0x58079Fd1c9BCdbe91eD4c83E1bE196B5FFBa62e6' as const,
} as const;

// For backwards compatibility
export const CONTRACT_ADDRESS = CONTRACTS.WEATHER_OPTION;

// Weather Option V3 ABI - Complete interface
export const WEATHER_OPTION_ABI = [
  // Constructor
  {
    type: 'constructor',
    inputs: [
      { name: '_rainfallCoordinator', type: 'address' },
      { name: '_rainfallConsumer', type: 'address' },
      { name: '_premiumCoordinator', type: 'address' },
      { name: '_premiumConsumer', type: 'address' },
      { name: '_vault', type: 'address' },
      { name: '_weth', type: 'address' },
    ],
  },
  
  // Main Functions
  {
    type: 'function',
    name: 'requestPremiumQuote',
    inputs: [
      {
        name: 'p',
        type: 'tuple',
        components: [
          { name: 'optionType', type: 'uint8' },
          { name: 'latitude', type: 'string' },
          { name: 'longitude', type: 'string' },
          { name: 'startDate', type: 'uint256' },
          { name: 'expiryDate', type: 'uint256' },
          { name: 'strikeMM', type: 'uint256' },
          { name: 'spreadMM', type: 'uint256' },
          { name: 'notional', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'requestId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createOptionWithQuote',
    inputs: [{ name: 'quoteRequestId', type: 'bytes32' }],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'requestSettlement',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [{ name: 'requestId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'settle',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimPayout',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  
  // View Functions
  {
    type: 'function',
    name: 'getOption',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          {
            name: 'terms',
            type: 'tuple',
            components: [
              { name: 'optionType', type: 'uint8' },
              { name: 'latitude', type: 'string' },
              { name: 'longitude', type: 'string' },
              { name: 'startDate', type: 'uint256' },
              { name: 'expiryDate', type: 'uint256' },
              { name: 'strikeMM', type: 'uint256' },
              { name: 'spreadMM', type: 'uint256' },
              { name: 'notional', type: 'uint256' },
              { name: 'premium', type: 'uint256' },
            ],
          },
          {
            name: 'state',
            type: 'tuple',
            components: [
              { name: 'status', type: 'uint8' },
              { name: 'buyer', type: 'address' },
              { name: 'createdAt', type: 'uint256' },
              { name: 'requestId', type: 'bytes32' },
              { name: 'locationKey', type: 'bytes32' },
              { name: 'actualRainfall', type: 'uint256' },
              { name: 'finalPayout', type: 'uint256' },
              { name: 'ownerAtSettlement', type: 'address' },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getActiveOptions',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPendingOption',
    inputs: [{ name: 'quoteRequestId', type: 'bytes32' }],
    outputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'optionType', type: 'uint8' },
          { name: 'latitude', type: 'string' },
          { name: 'longitude', type: 'string' },
          { name: 'startDate', type: 'uint256' },
          { name: 'expiryDate', type: 'uint256' },
          { name: 'strikeMM', type: 'uint256' },
          { name: 'spreadMM', type: 'uint256' },
          { name: 'notional', type: 'uint256' },
        ],
      },
      { name: 'buyer', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'simulatePayout',
    inputs: [
      { name: '_tokenId', type: 'uint256' },
      { name: 'rainfallMM', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isExpired',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pendingPayouts',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protocolFeeBps',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minPremium',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minNotional',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'vault',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  
  // ERC721 Functions
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  
  // Events
  {
    type: 'event',
    name: 'PremiumQuoteRequested',
    inputs: [
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'latitude', type: 'string', indexed: false },
      { name: 'longitude', type: 'string', indexed: false },
      { name: 'strikeMM', type: 'uint256', indexed: false },
      { name: 'spreadMM', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PremiumQuoteFulfilled',
    inputs: [
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'premium', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OptionCreated',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'optionType', type: 'uint8', indexed: false },
      { name: 'strikeMM', type: 'uint256', indexed: false },
      { name: 'spreadMM', type: 'uint256', indexed: false },
      { name: 'premium', type: 'uint256', indexed: false },
      { name: 'collateral', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OptionSettled',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'actualRainfall', type: 'uint256', indexed: false },
      { name: 'payout', type: 'uint256', indexed: false },
      { name: 'beneficiary', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PayoutClaimed',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'claimer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Premium Consumer ABI (to check quote status)
export const PREMIUM_CONSUMER_ABI = [
  {
    type: 'function',
    name: 'isRequestFulfilled',
    inputs: [{ name: 'requestId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'premiumByRequest',
    inputs: [{ name: 'requestId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'requestStatus',
    inputs: [{ name: 'requestId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

// Vault ABI (for LP operations)
export const VAULT_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'totalAssets',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'availableLiquidity',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxWithdraw',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMetrics',
    inputs: [],
    outputs: [
      { name: 'tvl', type: 'uint256' },
      { name: 'locked', type: 'uint256' },
      { name: 'available', type: 'uint256' },
      { name: 'utilization', type: 'uint256' },
      { name: 'premiums', type: 'uint256' },
      { name: 'payouts', type: 'uint256' },
      { name: 'netPnL', type: 'int256' },
    ],
    stateMutability: 'view',
  },
] as const;

// WETH ABI
export const WETH_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'wad', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'guy', type: 'address' },
      { name: 'wad', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// Types
export enum OptionType {
  CALL = 0,
  PUT = 1,
}

export enum OptionStatus {
  Active = 0,
  Expired = 1,
  Settling = 2,
  Settled = 3,
}

export interface CreateOptionParams {
  optionType: OptionType;
  latitude: string;
  longitude: string;
  startDate: bigint;
  expiryDate: bigint;
  strikeMM: bigint;
  spreadMM: bigint;
  notional: bigint;
}

export interface Option {
  tokenId: bigint;
  terms: {
    optionType: OptionType;
    latitude: string;
    longitude: string;
    startDate: bigint;
    expiryDate: bigint;
    strikeMM: bigint;
    spreadMM: bigint;
    notional: bigint;
    premium: bigint;
  };
  state: {
    status: OptionStatus;
    buyer: `0x${string}`;
    createdAt: bigint;
    requestId: `0x${string}`;
    locationKey: `0x${string}`;
    actualRainfall: bigint;
    finalPayout: bigint;
    ownerAtSettlement: `0x${string}`;
  };
}