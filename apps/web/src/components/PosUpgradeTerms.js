import { posPurposeLabels, posUpgradeTerms, posUpgradeTitle } from '../utils/posUpgrade';
export default function PosUpgradeTerms({ document }) {
  if (document.quoteType !== 'pos' || !document.posPurpose) return null;
  const terms = (document.billingPeriod || 'monthly') === 'monthly' ? document.posUpgradeTerms || (document.posPurpose !== 'customization' ? posUpgradeTerms : '') : '';
  return <section className="quotation-terms" aria-label="POS quotation purpose and upgrade terms"><h3>{posPurposeLabels[document.posPurpose]}</h3>
    {document.baseQuotationId && <p>Original subscription: {document.baseQuotationReference || 'Linked signed POS agreement'}</p>}
    {document.posPurpose === 'upgrade' && <p>Agreed upgrade effective date: {document.contractDetails?.effectiveDate || 'To be agreed'}. The new monthly subscription applies only after client approval and electronic signing, from the agreed effective date.</p>}
    {document.posPurpose === 'customization' && <p>This quotation covers one-time customization only and does not change the existing recurring subscription rate.</p>}
    {terms && <><h3>{posUpgradeTitle}</h3><p className="whitespace-pre-line">{terms}</p></>}
  </section>;
}
