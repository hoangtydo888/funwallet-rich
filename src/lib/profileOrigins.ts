export const PROFILE_ORIGIN = 'https://fun-profile9999.lovable.app';
// fun.rich is the main FUN Profile platform; phones reach this web wallet from there too.
export const PROFILE_ORIGINS = [PROFILE_ORIGIN, 'https://fun-profile-clone.lovable.app', 'https://fun.rich', 'https://www.fun.rich'] as const;
export const PROFILE_HOSTS = PROFILE_ORIGINS.map(origin => new URL(origin).host);
export function isProfilePeer(url: string): boolean {
  try { return PROFILE_ORIGINS.some(origin => origin === new URL(url).origin); } catch { return false; }
}
// Send the user back to the Profile site that actually connected, not always the default one.
export function profileOriginOf(url: string | undefined): string {
  return url && isProfilePeer(url) ? new URL(url).origin : PROFILE_ORIGIN;
}
