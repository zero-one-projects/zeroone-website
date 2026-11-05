export default function HardwareTerms({ document }) {
  if (!document.items?.some(item => item.chargeType === 'hardware') || !document.contractDetails?.hardwareTerms) return null;
  return <section className="quotation-terms" aria-label="Hardware procurement and payment terms"><h3>Hardware procurement and payment terms</h3><p className="whitespace-pre-line">{document.contractDetails.hardwareTerms}</p></section>;
}
