/**
 * Local registry of wills the user has deployed or loaded.
 *
 * Storage schema (localStorage key "smartWill:registry"):
 * {
 *   wallets: {
 *     "<walletAddr lowercase>": {
 *       wills: ["<contractAddr1>", "<contractAddr2>"],
 *       active: "<contractAddrN>"   // currently selected, optional
 *     }
 *   }
 * }
 *
 * Also a separate "smartWill:viewing" key for ad-hoc loads (someone else's
 * will by address — beneficiary or observer flow).
 */

const REGISTRY_KEY = "smartWill:registry";
const VIEWING_KEY = "smartWill:viewing";

function readRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return { wallets: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { wallets: {} };
    if (!parsed.wallets) parsed.wallets = {};
    return parsed;
  } catch {
    return { wallets: {} };
  }
}

function writeRegistry(reg) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
}

function bucket(walletAddr) {
  const key = walletAddr.toLowerCase();
  const reg = readRegistry();
  if (!reg.wallets[key]) reg.wallets[key] = { wills: [], active: null };
  return { reg, key };
}

/** Save a deployed will under the wallet that owns it. Sets it as active. */
export function saveWill(walletAddr, contractAddr) {
  const { reg, key } = bucket(walletAddr);
  const wills = reg.wallets[key].wills;
  if (!wills.includes(contractAddr)) wills.push(contractAddr);
  reg.wallets[key].active = contractAddr;
  writeRegistry(reg);
}

/** Get all contract addresses this wallet has deployed/saved. */
export function getWillsForWallet(walletAddr) {
  if (!walletAddr) return [];
  const { reg, key } = bucket(walletAddr);
  return reg.wallets[key].wills.slice();
}

/** Get the currently-active will for this wallet (last deployed or set). */
export function getActiveWill(walletAddr) {
  if (!walletAddr) return null;
  const { reg, key } = bucket(walletAddr);
  return reg.wallets[key].active || null;
}

/** Manually switch the active will (e.g. user picks from a dropdown). */
export function setActiveWill(walletAddr, contractAddr) {
  const { reg, key } = bucket(walletAddr);
  if (!reg.wallets[key].wills.includes(contractAddr)) {
    reg.wallets[key].wills.push(contractAddr);
  }
  reg.wallets[key].active = contractAddr;
  writeRegistry(reg);
}

/** Forget a will (does not affect on-chain state). */
export function removeWill(walletAddr, contractAddr) {
  const { reg, key } = bucket(walletAddr);
  reg.wallets[key].wills = reg.wallets[key].wills.filter((a) => a !== contractAddr);
  if (reg.wallets[key].active === contractAddr) {
    reg.wallets[key].active = reg.wallets[key].wills[0] || null;
  }
  writeRegistry(reg);
}

/** A "viewing" address — load any will by paste, independent of wallet. */
export function setViewingWill(contractAddr) {
  if (contractAddr) localStorage.setItem(VIEWING_KEY, contractAddr);
  else localStorage.removeItem(VIEWING_KEY);
}

export function getViewingWill() {
  return localStorage.getItem(VIEWING_KEY) || null;
}
