'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, WEATHER_OPTION_ABI } from '../lib/wagmi';
import { 
  formatEther, 
  formatDate, 
  getOptionTypeLabel, 
  getOptionStatusLabel,
  getStatusColor,
  shortenAddress,
  type Option 
} from '../lib/utils';

export default function OptionsList() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Read active options
  const { data: activeOptionIds, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: WEATHER_OPTION_ABI,
    functionName: 'getActiveOptions',
    query: {
      enabled: mounted && isConnected,
    },
  });

  // Request settlement
  const { writeContract: requestSettlement, data: settlementHash } = useWriteContract();
  const { isLoading: isSettlementPending } = useWaitForTransactionReceipt({
    hash: settlementHash,
  });

  // Settle option
  const { writeContract: settle, data: settleHash } = useWriteContract();
  const { isLoading: isSettlePending } = useWaitForTransactionReceipt({
    hash: settleHash,
  });

  const handleRequestSettlement = (tokenId: bigint) => {
    requestSettlement({
      address: CONTRACT_ADDRESS,
      abi: WEATHER_OPTION_ABI,
      functionName: 'requestSettlement',
      args: [tokenId],
    });
  };

  const handleSettle = (tokenId: bigint) => {
    settle({
      address: CONTRACT_ADDRESS,
      abi: WEATHER_OPTION_ABI,
      functionName: 'settle',
      args: [tokenId],
    });
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Active Options</h2>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Active Options</h2>
        <p className="text-gray-600">Please connect your wallet to view options</p>
      </div>
    );
  }

  if (!activeOptionIds || activeOptionIds.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Active Options</h2>
        <p className="text-gray-600">No active options found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Active Options</h2>
      
      <div className="space-y-4">
        {activeOptionIds.map((tokenId) => (
          <OptionCard
            key={tokenId.toString()}
            tokenId={tokenId}
            onRequestSettlement={handleRequestSettlement}
            onSettle={handleSettle}
            isSettlementPending={isSettlementPending}
            isSettlePending={isSettlePending}
          />
        ))}
      </div>
    </div>
  );
}

function OptionCard({ 
  tokenId, 
  onRequestSettlement, 
  onSettle,
  isSettlementPending,
  isSettlePending 
}: { 
  tokenId: bigint;
  onRequestSettlement: (tokenId: bigint) => void;
  onSettle: (tokenId: bigint) => void;
  isSettlementPending: boolean;
  isSettlePending: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: option } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: WEATHER_OPTION_ABI,
    functionName: 'getOption',
    args: [tokenId],
  }) as { data: Option | undefined };

  if (!option) return null;

  const { terms, state } = option;
  const isExpired = Date.now() / 1000 > Number(terms.expiryDate);

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg">Option #{tokenId.toString()}</h3>
            <div className="flex gap-2 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(state.status)}`}>
                {getOptionStatusLabel(state.status)}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {getOptionTypeLabel(terms.optionType)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Notional</p>
            <p className="font-bold">{formatEther(terms.notional)} ETH</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600">Strike</p>
            <p className="font-medium">{terms.strikeMM.toString()} mm</p>
          </div>
          <div>
            <p className="text-gray-600">Premium</p>
            <p className="font-medium">{formatEther(terms.premium)} ETH</p>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Location</p>
              <p className="font-medium">{terms.latitude}, {terms.longitude}</p>
            </div>
            <div>
              <p className="text-gray-600">Spread</p>
              <p className="font-medium">{terms.spreadMM.toString()} mm</p>
            </div>
            <div>
              <p className="text-gray-600">Start Date</p>
              <p className="font-medium">{formatDate(terms.startDate)}</p>
            </div>
            <div>
              <p className="text-gray-600">Expiry Date</p>
              <p className="font-medium">{formatDate(terms.expiryDate)}</p>
            </div>
            <div>
              <p className="text-gray-600">Buyer</p>
              <p className="font-medium font-mono">{shortenAddress(state.buyer)}</p>
            </div>
            <div>
              <p className="text-gray-600">Seller</p>
              <p className="font-medium font-mono">{shortenAddress(terms.seller)}</p>
            </div>
          </div>

          {state.actualRainfall > BigInt(0) && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Actual Rainfall</p>
              <p className="font-bold text-blue-600">{state.actualRainfall.toString()} mm</p>
              {state.finalPayout > BigInt(0) && (
                <>
                  <p className="text-sm text-gray-600 mt-2">Final Payout</p>
                  <p className="font-bold text-green-600">{formatEther(state.finalPayout)} ETH</p>
                </>
              )}
            </div>
          )}

          {isExpired && state.status === 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => onRequestSettlement(tokenId)}
                disabled={isSettlementPending}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 transition-colors"
              >
                {isSettlementPending ? 'Requesting...' : 'Request Settlement'}
              </button>
              <button
                onClick={() => onSettle(tokenId)}
                disabled={isSettlePending}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors"
              >
                {isSettlePending ? 'Settling...' : 'Settle'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}