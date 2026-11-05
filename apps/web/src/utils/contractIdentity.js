import companyIdentity from '../content/companyIdentity.json';
export function contractProvider(document) { return document.providerProfile || companyIdentity; }
export function contractAgreementDate(document, signature) {
  if (document.contractDetails?.agreementDateRule === 'signing') return signature?.agreementEffectiveDate || (signature?.signedAt ? new Date(signature.signedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : 'Upon electronic signing');
  return document.contractDetails?.agreementDate || document.issuedOn || '';
}
