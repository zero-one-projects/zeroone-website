import ElectronicAcceptanceTerms from './ElectronicAcceptanceTerms';
import { contractProvider, contractAgreementDate } from '../utils/contractIdentity';
import PosUpgradeTerms from './PosUpgradeTerms';
import HardwareTerms from './HardwareTerms';
import PosContractSummary from './PosContractSummary';
import MonthlySubscriptionSummary from './MonthlySubscriptionSummary';
import ContractRichText from './ContractRichText';
import logo from '../assets/landing/Newlogo.png';
import { quotationTotals } from '../utils/quotation';
import { SignatureDrawing } from './SignaturePad';

export const contractPrintStyles = `
@page{size:A4;margin:14mm 16mm 20mm;@bottom-center{content:counter(page);font:8pt Arial,sans-serif}
}
*{box-sizing:border-box}
body{margin:0;color:#202027;font:10pt/1.5 Arial,Helvetica,sans-serif;background:white}
.contract-document{position:relative;isolation:isolate}
.contract-watermark{position:fixed;left:12%;top:25%;width:76%;opacity:.025;z-index:-1}
.contract-layout{width:100%;border-collapse:collapse}
.contract-layout>thead{display:table-header-group}
.contract-layout>tbody>tr>td{padding:0}
.contract-layout>tfoot{display:table-footer-group}
.contract-layout>tfoot td{padding:12px 0 0}
.contract-letterhead{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:2px solid #75618e;padding:0 0 12px;margin-bottom:18px;text-align:left;font-weight:normal}
.contract-letterhead strong{font-size:15pt;color:#514568}
.contract-document .contract-letterhead p{font-size:9pt;margin:0}
.contract-letterhead img{width:43mm;height:20mm;object-fit:contain}
.contract-document h1{text-align:center;font-size:16pt;line-height:1.35;color:#514568;margin:4px 0 18px}
.contract-document h2{font-size:11.5pt;color:#514568;margin:22px 0 12px;break-after:avoid}
.contract-document p{margin:10px 0;white-space:pre-line;overflow-wrap:anywhere}
.contract-body-paragraph{text-align:left}
.contract-data{width:100%;border-collapse:collapse;margin:14px 0 20px;font-size:9.5pt}
.contract-data th,.contract-data td{border:1px solid #d4cbe1;padding:7px 9px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.contract-data th{background:#eeebf3;color:#514568}
.contract-data tr{break-inside:avoid}
.contract-data th:first-child{width:39%}
.contract-features th:first-child{width:7%}
.contract-data p{margin:0 0 5px}
.contract-strong td{font-weight:bold;background:#faf9fc}
.contract-annex{break-before:page}
.contract-signatures{display:grid;grid-template-columns:1fr;gap:24px;margin-top:20px;break-inside:avoid}
.contract-signatures>div{padding:14px;border:1px solid #ded7e8;border-radius:8px}
.contract-acceptance{margin-top:30px;break-inside:avoid}
.contract-acceptance>h2{font-size:12pt;margin-bottom:8px}
.contract-signatures h2{font-size:10pt;margin:0 0 14px}
.contract-signatures p{font-size:9pt}
.contract-signature-fields{margin:0;display:grid;gap:12px}
.contract-signature-fields dt{font-size:8pt;color:#666;margin-bottom:4px}
.contract-signature-fields dd{margin:0;min-height:24px;font-size:9pt;line-height:1.45;overflow-wrap:anywhere}
.contract-signature-fields .contract-empty-field{border-bottom:1px solid #bbb;min-height:24px}
.contract-signature-fields .contract-signing-line{min-height:58px;border-bottom:1px solid #bbb}
.contract-signature-fields .contract-typed-signature{font-size:21pt;padding:8px 0;border:0}
.contract-signature-fields .contract-signature-image{height:65px;border:0}
.contract-signature-image{width:100%;height:75px;border-bottom:1px solid #aaa}
.contract-typed-signature{font:italic 23pt Georgia,serif;border-bottom:1px solid #aaa;padding:12px 0}
.contract-footer{border-top:1px solid #999;display:flex;justify-content:space-between;gap:12px;padding-top:6px;font-size:8pt}
.contract-footer a{color:#514568}
.contract-small{font-size:8.5pt;color:#666}
.contract-price-note{font-size:9pt}
.contract-placeholder{color:#777}
.contract-agreement-title{padding-bottom:18px}
.contract-meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 16px;border:1px solid #ded7e8;background:#faf9fc;border-radius:8px;margin:0 0 18px}
.contract-meta p{margin:0;font-size:9pt;line-height:1.6}
.contract-meta strong{display:block;color:#514568;font-size:8pt;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}
.contract-project{margin:0 0 16px;font-size:11pt}
.contract-parties{display:grid;grid-template-columns:1fr;gap:20px;margin:18px 0;break-inside:avoid}
.contract-party{border-left:3px solid #c0b2d1;padding:4px 0 4px 14px}
.contract-party h2{margin:0 0 8px;font-size:9pt;letter-spacing:.08em;text-transform:uppercase}
.contract-party p{margin:0;line-height:1.65;font-size:10pt}
.contract-party strong{display:block;margin-bottom:6px}
.contract-party .contract-party-role{margin-top:6px;color:#666;font-size:9pt}
.contract-introduction{margin-bottom:26px}
.contract-terms .contract-clause + .contract-clause{margin-top:22px}
.contract-terms .contract-clause>h2{margin:0 0 10px;padding-top:12px;border-top:1px solid #e5e0ec;line-height:1.4;letter-spacing:.01em;break-after:avoid}
.contract-terms .contract-body-paragraph{margin:0 0 12px;line-height:1.55;text-align:left;orphans:3;widows:3}
.contract-terms .contract-clause-list{margin:4px 0 14px;padding:0 0 0 5px;list-style:none;line-height:1.7}
.contract-terms .contract-clause-list li{display:flex;align-items:baseline;gap:10px;margin:0 0 7px;break-inside:avoid}
.contract-terms .contract-list-marker{flex:0 0 18px;color:inherit;text-align:right}
.contract-terms .contract-clause-list li>span:last-child{min-width:0}
.contract-terms .contract-clause>div:last-child>:last-child{margin-bottom:0}
@media screen and (max-width:600px){.contract-parties,.contract-meta,.contract-signatures{grid-template-columns:1fr}}

@media screen{body{max-width:820px;margin:24px auto;padding:36px}
.contract-footer{position:static;margin-top:30px}
.contract-watermark{position:absolute}
.contract-annex{margin-top:45px}
}
`;

function readableDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' });
}


export default function ContractDocument({ document, reference, signature, templatePreview = false, signingReview = false }) {
  const details = document.contractDetails || {};
  const provider = contractProvider(document);
  const agreementDate = document.quoteType === 'pos' && !templatePreview ? contractAgreementDate(document, signature) : details.agreementDate || (signature?.signedAt ? readableDate(signature.signedAt) : '');
  const totals = quotationTotals(document);
  const money = (value) => templatePreview ? '' : `${document.currency} ${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const showRecurring = totals.hasRecurring || (templatePreview && document.quoteType !== 'project');
  const period = templatePreview ? 'agreed billing period' : document.billingPeriod === 'yearly' ? 'year' : 'month';
  const pos = document.quoteType === 'pos';
  const showPaymentAnnex = pos || ['subscription', 'sync_court'].includes(document.quoteType);
  const mainTitle = pos && document.posPurpose === 'upgrade' ? 'POS SUBSCRIPTION UPGRADE ADDENDUM' : pos && document.posPurpose === 'customization' ? 'POS ONE-TIME CUSTOMIZATION AGREEMENT' : pos ? 'POS SYSTEM SUBSCRIPTION & SERVICE AGREEMENT' : document.quoteType === 'sync_court' ? 'SYNC COURT SUBSCRIPTION & SERVICE AGREEMENT' : document.quoteType === 'subscription' ? 'SUBSCRIPTION & SERVICE AGREEMENT' : 'PROJECT SERVICE AGREEMENT';
  const paymentTitle = pos ? 'POS SUBSCRIPTION ORDER FORM & PAYMENT AGREEMENT' : showRecurring ? 'SUBSCRIPTION ORDER FORM & PAYMENT AGREEMENT' : 'PROJECT ORDER FORM & PAYMENT AGREEMENT';
  const tableValue = (text) => text || '';
  const signingParties = [
    { title: 'CLIENT ACCEPTANCE', company: document.clientName, name: signature?.signerName || details.authorizedRepresentative, position: details.clientPosition, signature }
  ];
  const signatureSection = <section className="contract-acceptance" aria-label="Client acceptance">
    <h2>SERVICE PROVIDER</h2><p>{provider.name}</p><p>{provider.address}</p>
    <div className="contract-signatures">
    {signingParties.map((party) => <div key={party.title}><h2>{party.title}</h2>
      <p>{signature?.consentText || 'By signing below, I confirm that I am authorized to enter into this agreement on behalf of the client and agree to the agreement terms, payment obligations, and conditions stated above.'}</p>
      <dl className="contract-signature-fields">
        {[['Business / Company', party.company], ['Authorized Representative', party.name], ['Position / Title', party.position]].map(([label, content]) => <div key={label}><dt>{label}</dt><dd className={!content ? 'contract-empty-field' : undefined}>{content || '\u00a0'}</dd></div>)}
        <div><dt>Electronic Signature</dt><dd className="contract-signing-line">{party.signature?.type === 'drawn'
          ? <SignatureDrawing strokes={party.signature.strokes} className="contract-signature-image" />
          : party.signature?.type === 'typed' ? <div className="contract-typed-signature">{party.signature.typedName}</div> : null}</dd></div>
        <div><dt>Date Signed</dt><dd className={!party.signature?.signedAt ? 'contract-empty-field' : undefined}>{party.signature?.signedAt ? readableDate(party.signature.signedAt) : '\u00a0'}</dd></div>
      </dl>
      {party.signature && <p className="contract-small">Electronically signed · Verified email: {party.signature.email}<br />{party.signature.signedAt}</p>}
    </div>)}
    </div>
  </section>;
  return <article className="contract-document">
    <img className="contract-watermark" src="/zeroone-tab-icon.svg" alt="" />
    <table className="contract-layout"><thead><tr><th><header className="contract-letterhead"><div><strong>{provider.name}</strong><p>{provider.address}</p><p>Contact number: {provider.phone}</p></div><img src={logo} alt="Zero One Information Technology Inc." /></header></th></tr></thead>
    <tbody><tr><td>
      <div className="contract-agreement-title"><h1>{mainTitle}</h1>
        <div className="contract-meta"><p><strong>Quotation reference</strong>{reference || 'DRAFT'}</p><p><strong>Agreement date</strong>{agreementDate || 'To be completed'}</p></div>
        {!templatePreview && document.title && <p className="contract-project"><strong>Project / package:</strong> {document.title}</p>}
        {templatePreview && <p className="contract-small">Template preview. Client details are filled from the quotation. Signature details are recorded when the contract is signed.</p>}
      </div>
      <section className="contract-introduction" aria-label="Parties to the agreement">
        <p>{details.agreementIntroduction || (details.agreementDateRule === 'signing' && !signature ? 'This agreement takes effect upon electronic signing by the Client, by and between:' : `This agreement is entered into${agreementDate ? ` on ${agreementDate}` : ''} by and between:`)}</p>
        <div className="contract-parties">
          <div className="contract-party"><h2>Provider</h2><p><strong>{provider.name.toUpperCase()}</strong></p><p>{provider.address}</p><p className="contract-party-role">Referred to in this agreement as the Provider.</p></div>
          <div className="contract-party"><h2>Client</h2><p><strong className={!document.clientName ? 'contract-placeholder' : undefined}>{document.clientName || 'Client / Company Name'}</strong></p><p className={!document.clientAddress ? 'contract-placeholder' : undefined}>{document.clientAddress || 'Client business address'}</p><p className="contract-party-role">Referred to in this agreement as the Client.</p></div>
        </div>
        <p>Collectively referred to as the Parties.</p>
      </section>
      <ContractRichText text={signature?.contractText || document.contractText} format={document.contractStyle} />
      <ElectronicAcceptanceTerms document={document} /><PosUpgradeTerms document={document} /><HardwareTerms document={document} />
      {!showPaymentAnnex && !signingReview && signatureSection}
      {showPaymentAnnex && <section className="contract-annex"><h1>{paymentTitle}</h1>
        <p>This order form records the approved scope and charges for quotation <strong>{reference || 'DRAFT'}</strong> and is read together with the service agreement above.</p>
        <h2>1. CLIENT &amp; {showRecurring ? 'SUBSCRIPTION' : 'PROJECT'} INFORMATION</h2>
        {pos ? <PosContractSummary document={document} reference={reference} templatePreview={templatePreview} /> : <table className="contract-data"><thead><tr><th>Particulars</th><th>Details</th></tr></thead><tbody>{[
          ['Agreement Date', tableValue(details.agreementDate)], ['Client / Business Name', tableValue(document.clientName)], ['Authorized Representative', tableValue(signature?.signerName || details.authorizedRepresentative)], ['Project / Package', document.title],
          ...(showRecurring ? [['Number of Branches / Terminals', tableValue(details.branches)], ['Subscription Effective Date', tableValue(details.effectiveDate)], ['Minimum Subscription Period', tableValue(details.minimumPeriod)]] : [])
        ].map(([label, content]) => <tr key={label}><td>{label}</td><td>{content}</td></tr>)}</tbody></table>}
        {pos && details.branches && <p><strong>Number of Branches / Terminals:</strong> {details.branches}</p>}
        <h2>2. APPROVED FEATURES &amp; SERVICES</h2>
        <table className="contract-data contract-features"><thead><tr><th>No.</th><th>Feature / Service</th><th>Description / Scope</th></tr></thead><tbody>{templatePreview && <tr><td colSpan={3}>Approved features and services will be filled from the quotation.</td></tr>}{document.items.map((item, index) => <tr key={index}><td>{index + 1}</td><td>{item.description}</td><td>{item.scope?.length ? item.scope.map((group, groupIndex) => <p key={groupIndex}><strong>{group.title}</strong><br />{group.details}</p>) : item.description}</td></tr>)}</tbody></table>
        <h2>3. {showRecurring ? 'SUBSCRIPTION & ' : ''}PAYMENT SUMMARY</h2>
        <table className="contract-data"><thead><tr><th>Description</th><th>Amount / Payment Terms</th></tr></thead><tbody>
          {document.items.map((item, index) => <tr key={index}><td>{item.description}{item.chargeType === 'setup' ? ' — Setup / Implementation' : item.chargeType === 'addon' ? ' — Additional Feature' : item.chargeType === 'hardware' ? ' — Hardware' : item.chargeType === 'milestone' ? ' — Milestone payment' : ''}</td><td>{money(totals.amounts[index])}{!templatePreview && (item.chargeType === 'recurring' ? ` / ${period}` : ' · One-time')}</td></tr>)}
          {Number(document.discount) > 0 && <tr><td>One-Time Discount</td><td>−{money(document.discount)}</td></tr>}
          {Number(document.taxRate) > 0 && <tr><td>One-Time Tax ({document.taxRate}%)</td><td>{money(totals.tax)}</td></tr>}
          <tr className="contract-strong"><td>Total One-Time Charges</td><td>{money(totals.total)}</td></tr>
          {showRecurring && <tr className="contract-strong"><td>Total Recurring Subscription{Number(document.taxRate) > 0 ? ' (including tax)' : ''}</td><td>{templatePreview ? '' : `${money(totals.recurringTotal)} / ${period}`}</td></tr>}
          {details.initialBillingTerms && <tr><td>Initial Billing Arrangements</td><td>{details.initialBillingTerms}</td></tr>}
          {showRecurring && <tr><td>Subscription Payment Commencement</td><td>{tableValue(details.billingCommencement)}</td></tr>}
        </tbody></table>
        {!templatePreview && <MonthlySubscriptionSummary document={document} className="contract-subscription-notice" />}
        <h2>4. PAYMENT TERMS</h2>
        <table className="contract-data"><thead><tr><th>Payment Particulars</th><th>Agreed Terms</th></tr></thead><tbody>
          {showRecurring && <tr><td>Billing Frequency</td><td>{templatePreview ? tableValue('') : document.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}</td></tr>}
          <tr><td>Payment Due Date / Terms</td><td>{tableValue(details.paymentTerms || document.notes)}</td></tr><tr><td>Payment Grace Period</td><td>{tableValue(details.gracePeriod)}</td></tr>
          {showRecurring && <><tr><td>Minimum Subscription Commitment</td><td>{tableValue(details.minimumPeriod)}</td></tr><tr><td>Early Termination Fee / Formula</td><td>{tableValue(details.terminationTerms)}</td></tr></>}
        </tbody></table>
        {document.timeline && <p><strong>Implementation timeline:</strong> {document.timeline}</p>}
        {!signingReview && signatureSection}
      </section>}
    </td></tr></tbody><tfoot><tr><td><footer className="contract-footer"><a href="https://zerooneitinc.com/">zerooneitinc.com</a><span>info@zerooneitinc.com</span><a href="https://www.facebook.com/zeroone.it.inc">facebook.com/zeroone.it.inc</a></footer></td></tr></tfoot></table>
  </article>;
}
