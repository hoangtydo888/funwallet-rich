import { beforeEach, expect, test } from "bun:test";
import { Wallet } from "ethers";

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;
beforeEach(() => store.clear());

const { hasRecoveryPhrase, revealRecoveryPhrase, storeRecoveryPhrase } = await import("../src/lib/recoveryPhraseStore");
const PASSWORD = "correct horse battery";

test("phrase is stored encrypted and revealed only with the right password", async () => {
  const wallet = Wallet.createRandom();
  await storeRecoveryPhrase(wallet.address, wallet.mnemonic!.phrase, PASSWORD);

  expect(hasRecoveryPhrase(wallet.address)).toBe(true);
  expect([...store.values()].join()).not.toContain(wallet.mnemonic!.phrase.split(" ")[0] + " ");
  expect(await revealRecoveryPhrase(wallet.address, PASSWORD)).toBe(wallet.mnemonic!.phrase);
  await expect(revealRecoveryPhrase(wallet.address, "wrong password!!")).rejects.toThrow();
});

test("a phrase for another address is refused and missing phrases return null", async () => {
  const [a, b] = [Wallet.createRandom(), Wallet.createRandom()];
  await expect(storeRecoveryPhrase(a.address, b.mnemonic!.phrase, PASSWORD)).rejects.toThrow();
  expect(hasRecoveryPhrase(a.address)).toBe(false);
  expect(await revealRecoveryPhrase(a.address, PASSWORD)).toBeNull();
});
