export default function ElectronicAcceptanceTerms({ document }) {
  const policy = document.acceptancePolicy;
  if (!policy) return null;
  return <section className="quotation-terms" aria-label="Electronic acceptance and confirmation"><h3>{policy.title}</h3><p>{policy.terms}</p></section>;
}
