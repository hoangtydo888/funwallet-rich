/** Within a selected chain, a token is identified by contract, never its symbol.
 * A malicious/custom ERC20 can legitimately use a familiar symbol such as BNB. */
export const assetKey=(token:{address:string|null}):string=>token.address===null?'native':token.address.toLowerCase();
