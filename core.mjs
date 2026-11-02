export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function normalizeCode(value) {
  const code=String(value).toUpperCase().replace(/[\s-]/g,'');
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code)?code:'';
}
export function validRequest(v) {
  return !!v && v.protocol==='ym1' && typeof v.nonce==='string' && /^[a-f0-9]{32}$/.test(v.nonce) && typeof v.challenge==='string' && /^\d{6}$/.test(v.challenge);
}
export function authorizedCall(expected,peer,meta,open) {
  return !!expected && open && peer===expected.peer && validRequest(meta) && meta.nonce===expected.nonce && meta.challenge===expected.challenge;
}
export class CaptureSession {
  generation=0; stream=null;
  begin(){this.end();return this.generation;}
  accept(g,stream){if(g!==this.generation){stream.getTracks().forEach(t=>t.stop());return false;}this.stream=stream;return true;}
  end(){this.generation++;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;}
}
export function randomCode(){const bytes=crypto.getRandomValues(new Uint8Array(8));return Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');}
export function nonce(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');}
