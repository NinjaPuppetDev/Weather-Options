import { formatUnits, parseUnits } from 'viem';

export const OptionType = {
  CALL: 0,
  PUT: 1,
} as const;

export const OptionStatus = {
  ACTIVE: 0,
  EXPIRED: 1,
  SETTLED: 2,
  CANCELED: 3,
} as const;

export type OptionTypeValue = typeof OptionType[keyof typeof OptionType];
export type OptionStatusValue = typeof OptionStatus[keyof typeof OptionStatus];

export interface OptionTerms {
  optionType: OptionTypeValue;
  latitude: string;
  longitude: string;
  startDate: bigint;
  expiryDate: bigint;
  strikeMM: bigint;
  spreadMM: bigint;
  notional: bigint;
  premium: bigint;
  seller: string;
}

export interface OptionState {
  status: OptionStatusValue;
  buyer: string;
  createdAt: bigint;
  requestId: string;
  actualRainfall: bigint;
  finalPayout: bigint;
}

export interface Option {
  tokenId: bigint;
  terms: OptionTerms;
  state: OptionState;
}

export const formatEther = (value: bigint): string => {
  return formatUnits(value, 18);
};

export const parseEther = (value: string): bigint => {
  return parseUnits(value, 18);
};

export const formatDate = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
};

export const formatDateTime = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleString();
};

export const getOptionTypeLabel = (type: OptionTypeValue): string => {
  return type === OptionType.CALL ? 'Call' : 'Put';
};

export const getOptionStatusLabel = (status: OptionStatusValue): string => {
  switch (status) {
    case OptionStatus.ACTIVE:
      return 'Active';
    case OptionStatus.EXPIRED:
      return 'Expired';
    case OptionStatus.SETTLED:
      return 'Settled';
    case OptionStatus.CANCELED:
      return 'Canceled';
    default:
      return 'Unknown';
  }
};

export const getStatusColor = (status: OptionStatusValue): string => {
  switch (status) {
    case OptionStatus.ACTIVE:
      return 'bg-green-100 text-green-800';
    case OptionStatus.EXPIRED:
      return 'bg-yellow-100 text-yellow-800';
    case OptionStatus.SETTLED:
      return 'bg-blue-100 text-blue-800';
    case OptionStatus.CANCELED:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const shortenAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};