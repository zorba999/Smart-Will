import { createClient } from "genlayer-js";
import { CHAIN } from "./wallet";

export const chain = CHAIN;

/**
 * Make a genlayer-js client. If `address` is given, the client uses
 * window.ethereum to sign — no private key is held by the dApp.
 * Without an address, the client is read-only.
 */
export function makeClient(address) {
  if (address) {
    return createClient({ chain: CHAIN, account: address });
  }
  return createClient({ chain: CHAIN });
}
