// One implementation for PWA/shared callers; preserve legacy-v1 decrypt support.
export { ENCRYPTION_CONFIG, encryptPrivateKey, decryptPrivateKey, encryptRecoveryPhrase, decryptRecoveryPhrase, verifyPassword, secureErase, getPasswordStrength } from '../../lib/keyEncryption';
