/**
 * EVM wallet adapter for GenLayer Bradbury Testnet.
 *
 * Uses window.ethereum (MetaMask, Rabby, Trust Wallet, etc.) — no private key
 * is ever held by the dApp. All signing goes through the user's wallet.
 *
 * GenLayer is EVM-compatible (chainId 4221) so wallet_addEthereumChain works
 * without any special snap. genlayer-js's createClient takes the user's
 * address as the `account` and uses window.ethereum for sign/send.
 */

import { testnetBradbury } from "genlayer-js/chains";

export const CHAIN = testnetBradbury;
const CHAIN_ID_HEX = "0x" + CHAIN.id.toString(16); // 4221 → 0x107d

function getProvider() {
  return typeof window !== "undefined" ? window.ethereum : null;
}

export function hasInjectedWallet() {
  return !!getProvider();
}

async function ensureBradburyNetwork() {
  const provider = getProvider();
  if (!provider) throw new Error("No EVM wallet detected. Install MetaMask, Rabby, or similar.");

  const currentChainId = await provider.request({ method: "eth_chainId" });
  if (currentChainId === CHAIN_ID_HEX) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    // Chain not added yet (error code 4902 — chain not added).
    if (switchError.code === 4902 || /Unrecognized chain/i.test(switchError.message || "")) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: CHAIN.name,
            rpcUrls: CHAIN.rpcUrls.default.http,
            nativeCurrency: CHAIN.nativeCurrency,
            blockExplorerUrls: CHAIN.blockExplorers?.default?.url
              ? [CHAIN.blockExplorers.default.url]
              : [],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Prompt the user's wallet to connect and switch to Bradbury.
 * Returns the connected address (lowercase 0x...).
 */
export async function connectWallet() {
  const provider = getProvider();
  if (!provider) {
    throw new Error(
      "No EVM wallet detected. Install MetaMask or Rabby to use this dApp.",
    );
  }
  await ensureBradburyNetwork();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts || !accounts.length) throw new Error("No account returned by wallet.");
  return accounts[0];
}

/**
 * Silent reconnect — returns the previously connected address without
 * prompting, or null if the wallet is locked / never connected.
 */
export async function silentReconnect() {
  const provider = getProvider();
  if (!provider) return null;
  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    return accounts && accounts.length ? accounts[0] : null;
  } catch {
    return null;
  }
}

export function onAccountsChanged(handler) {
  const provider = getProvider();
  if (!provider) return () => {};
  const cb = (accounts) => handler(accounts && accounts[0] ? accounts[0] : null);
  provider.on?.("accountsChanged", cb);
  return () => provider.removeListener?.("accountsChanged", cb);
}

export function onChainChanged(handler) {
  const provider = getProvider();
  if (!provider) return () => {};
  const cb = (chainIdHex) => handler(chainIdHex);
  provider.on?.("chainChanged", cb);
  return () => provider.removeListener?.("chainChanged", cb);
}

export function isCorrectChain(chainIdHex) {
  return chainIdHex === CHAIN_ID_HEX;
}
