const key = (token) => `quotation-signing-session:${token}`;
export function readSigningSession(token, documentVersion) {
  try {
    const session = JSON.parse(window.sessionStorage.getItem(key(token)));
    if (session?.documentVersion === documentVersion && typeof session.verificationProof === 'string' && session.verificationProof.length <= 3000 && typeof session.challengeId === 'string' && Date.parse(session.expiresAt) > Date.now()) return session;
    window.sessionStorage.removeItem(key(token));
  } catch { /* The verified flow still works in memory when browser storage is unavailable. */ }
  return null;
}
export function storeSigningSession(token, session) {
  try { if (session) window.sessionStorage.setItem(key(token), JSON.stringify(session)); else window.sessionStorage.removeItem(key(token)); }
  catch { /* Private browsing or a full storage quota must not interrupt signing. */ }
}
