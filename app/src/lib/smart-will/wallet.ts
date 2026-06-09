// Lightweight EVM wallet helper (window.ethereum). Mock-friendly fallback.
import { useEffect, useState, useCallback } from "react";

const CHAIN_ID_HEX = "0x107D"; // 4221
const CHAIN_PARAMS = {
  chainId: CHAIN_ID_HEX,
  chainName: "GenLayer Bradbury Testnet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, fn: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, fn: (...args: unknown[]) => void) => void;
    };
  }
}

const MOCK_KEY = "smartwill:mock-wallet";

export interface WalletState {
  address: string | null;
  isMock: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(MOCK_KEY) : null;
    if (stored) {
      setAddress(stored);
      setIsMock(true);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];
        if (accounts?.[0]) {
          // Ensure the wallet is on Bradbury: try to switch, add the chain if
          // the wallet doesn't know it yet, then switch.
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: CHAIN_ID_HEX }],
            });
          } catch {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [CHAIN_PARAMS],
              });
            } catch {
              /* user may decline; reads still work, writes will prompt */
            }
          }
          setAddress(accounts[0]);
          setIsMock(false);
          localStorage.removeItem(MOCK_KEY);
          return;
        }
      }
      // Fallback: generate a deterministic mock address.
      const mock =
        "0x" +
        Array.from({ length: 40 }, () =>
          "0123456789abcdef"[Math.floor(Math.random() * 16)],
        ).join("");
      localStorage.setItem(MOCK_KEY, mock);
      setAddress(mock);
      setIsMock(true);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsMock(false);
    localStorage.removeItem(MOCK_KEY);
  }, []);

  return { address, isMock, connecting, connect, disconnect };
}
