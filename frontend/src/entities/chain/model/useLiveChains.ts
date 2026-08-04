import { useEffect, useRef } from 'react';
import { getLiveUpdates } from '@/entities/chain/api/chainApi';
import { useToast } from '@/shared/ui/Toast';
import type { GeneratedChain } from '@/entities/chain/model/types';

const STORAGE_KEY = 'signal_chain_last_seen_id';

function getInitialId(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

export function useLiveChains(pollIntervalMs = 45000) {
  const { showToast } = useToast();
  
  // Track the highest ID seen. Initialize from localStorage if available.
  const lastSeenId = useRef<number>(getInitialId());
  
  // Track if this is the very first poll in a new session (to prevent a blast of toasts)
  const isInitialLoad = useRef<boolean>(lastSeenId.current === 0);

  useEffect(() => {
    let timeoutId: number;

    const poll = async () => {
      try {
        const response = await getLiveUpdates(lastSeenId.current);
        const newChains = response.chains;

        if (newChains && newChains.length > 0) {
          // Find the new highest ID
          const maxId = Math.max(...newChains.map((c: GeneratedChain) => c.id));
          lastSeenId.current = maxId;
          
          try {
            localStorage.setItem(STORAGE_KEY, maxId.toString());
          } catch {
            // Ignore storage errors
          }

          // If this is the initial load for a brand new user, just set the watermark silently.
          // We don't want to show 50 toasts for historical live events.
          if (isInitialLoad.current) {
            isInitialLoad.current = false;
          } else {
            // Show toasts for the new chains!
            // We use 'success' kind to make it stand out, but with a custom message.
            newChains.forEach((chain: GeneratedChain) => {
               showToast(
                 'success', 
                 `Live Pattern Detected: ${chain.trigger_symbol} -> ${chain.affected_symbol}`
               );
            });
          }
        } else if (isInitialLoad.current) {
          isInitialLoad.current = false;
        }
      } catch (err) {
        console.error('Failed to poll live chains:', err);
      }

      // Schedule next poll completely independently of other app loops
      timeoutId = window.setTimeout(poll, pollIntervalMs);
    };

    // Start polling loop
    timeoutId = window.setTimeout(poll, 1000); // 1 second initial delay

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pollIntervalMs, showToast]);
}
