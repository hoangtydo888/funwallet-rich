let tail:Promise<unknown>=Promise.resolve();
/** All production vault writes cooperate across tabs where Web Locks exists.
 * The fallback serializes this JS context; revision checks still reject stale
 * snapshots, but older app versions do not participate in this protocol. */
export async function withVaultWriteLock<T>(work:()=>Promise<T>):Promise<T> {
  const next=tail.catch(()=>undefined).then(()=>typeof navigator!=='undefined'&&navigator.locks
    ?navigator.locks.request('fun-wallet-vault-write-v2',work):work());
  tail=next;
  return next;
}
