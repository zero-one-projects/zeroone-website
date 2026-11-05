import { contractProvider, contractAgreementDate } from '../utils/contractIdentity';
export default function ContractPartiesSummary({ document, signature }) {
  const date = contractAgreementDate(document, signature);
  const provider = contractProvider(document);
  return <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm" aria-label="Completed agreement details">
    <h3 className="font-bold">Agreement details</h3>
    <dl className="mt-3 grid gap-3"><div><dt className="font-bold">Agreement effective date</dt><dd>{date || 'Agreement date required'}</dd></div><div><dt className="font-bold">Service provider</dt><dd>{provider.name}</dd></div><div><dt className="font-bold">Provider address</dt><dd>{provider.address}</dd></div><div><dt className="font-bold">Client / Business Name</dt><dd>{document.clientName || 'Client name required'}</dd></div><div><dt className="font-bold">Client business address</dt><dd className="whitespace-pre-line">{document.clientAddress || 'Client business address required'}</dd></div></dl>
  </section>;
}
