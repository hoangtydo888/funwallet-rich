export const PROFILE_ORIGIN = 'https://fun-profile9999.lovable.app';
export const PROFILE_ORIGINS = [PROFILE_ORIGIN, 'https://fun-profile-clone.lovable.app'] as const;
export const PROFILE_HOSTS = PROFILE_ORIGINS.map(origin => new URL(origin).host);
export function isProfilePeer(url: string): boolean {
  try { return PROFILE_ORIGINS.some(origin => origin === new URL(url).origin); } catch { return false; }
}
