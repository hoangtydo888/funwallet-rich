import {expect,it} from 'bun:test';
import {isProfilePeer,PROFILE_ORIGIN} from '../../src/lib/profileOrigins';
import {loginMessage} from '../../src/lib/walletconnectPolicy';
import {hexlify,toUtf8Bytes} from 'ethers';
const account='0x1111111111111111111111111111111111111111';
const challenge=(host:string,uri=host)=>hexlify(toUtf8Bytes(`${host} wants you to sign in with your Ethereum account:\n${account}\n\nSign in to FUN Profile\n\nURI: https://${uri}\nVersion: 1\nChain ID: 56\nNonce: ${'a'.repeat(32)}\nIssued At: ${new Date().toISOString()}`));
it('accepts only the published Profile origins, including fun.rich',()=>{
 expect(PROFILE_ORIGIN).toBe('https://fun-profile9999.lovable.app');
 expect(isProfilePeer(PROFILE_ORIGIN+'/wallet/asset')).toBe(true);
 expect(isProfilePeer('https://fun-profile-clone.lovable.app')).toBe(true);
 expect(isProfilePeer('https://fun-profile9999.lovable.app.evil.example')).toBe(false);
 expect(isProfilePeer('https://evil.example')).toBe(false);
 expect(isProfilePeer('https://fun.rich/wallet/asset')).toBe(true);
 expect(isProfilePeer('https://fun.rich.evil.example')).toBe(false);
 expect(isProfilePeer('http://fun.rich')).toBe(false);
});
it('allows the current login domain while rejecting cross-domain and unrelated signatures',()=>{
 expect(loginMessage([challenge('fun-profile9999.lovable.app'),account],account)).toBeInstanceOf(Uint8Array);
 expect(loginMessage([challenge('fun.rich'),account],account)).toBeInstanceOf(Uint8Array);
 expect(()=>loginMessage([challenge('evil.example'),account],account)).toThrow();
 expect(()=>loginMessage([challenge('fun-profile9999.lovable.app','fun-profile-clone.lovable.app'),account],account)).toThrow();
});
