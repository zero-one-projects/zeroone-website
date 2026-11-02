const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');
const { ContractFile } = require('../models');
const { validatePdf, fileMetadata, getContractFile } = require('./contract-files');
const { renderSignedContractPdf } = require('./signed-contract-pdf');
const { documentHash } = require('./quotation-response');
async function samplePdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([450,650]).drawText('Original uploaded contract page one');
  pdf.addPage([450,650]).drawText('Original uploaded contract page two');
  pdf.addJavaScript('automatic-action', 'app.alert("unexpected")');
  return { originalname: 'Original contract.pdf', mimetype: 'application/pdf', buffer: Buffer.from(await pdf.save()) };
}
test('PDF uploads validate actual content, enforce limits, and remove embedded actions', async () => {
  const file = await validatePdf(await samplePdf());
  assert.equal(file.pageCount, 2); assert.match(file.sha256, /^[a-f0-9]{64}$/);
  const parsed = await PDFDocument.load(file.data);
  assert.equal(parsed.getPage(0).getWidth(),450);
  const names = parsed.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  assert.equal(names?.has(PDFName.of('JavaScript')), false);
  await assert.rejects(validatePdf({ originalname:'bad.pdf',mimetype:'application/pdf',buffer:Buffer.from('<html>fake</html>') }), {statusCode:400});
  await assert.rejects(validatePdf({ originalname:'fake.txt',mimetype:'text/plain',buffer:(await samplePdf()).buffer }), {statusCode:400});
  const huge = Buffer.alloc(2*1024*1024+1); huge.write('%PDF-');
  await assert.rejects(validatePdf({ originalname:'large.pdf',mimetype:'application/pdf',buffer:huge }), {statusCode:400});
});
test('signed uploaded PDF preserves original pages and appends a recorded signature page', async () => {
  const file = { ...await validatePdf(await samplePdf()), id:'12345678-1234-4234-8234-123456789012',quoteType:'project' };
  mock.method(ContractFile,'findByPk',async id=>id===file.id?file:null);
  try {
    const document = {quoteType:'project',title:'Project',clientName:'Client Company',contractSource:'pdf',contractPdf:fileMetadata(file),contractDetails:{}};
    const signed = await renderSignedContractPdf({reference:'ZO-2026-00001',document,signature:{type:'typed',typedName:'Client Name',signerName:'Client Name',email:'client@example.com',signedAt:'2026-10-26T01:00:00Z',contractText:'PDF manifest',documentHash:documentHash(document)}});
    const parsed = await PDFDocument.load(signed);
    assert.equal(parsed.getPageCount(),3); assert.equal(parsed.getPage(0).getWidth(),450); assert.equal(parsed.getPage(1).getHeight(),650);
    assert(signed.length<3*1024*1024);
    await assert.rejects(getContractFile({...fileMetadata(file),sha256:'b'.repeat(64)},true),{statusCode:400});
  } finally {mock.restoreAll();}
});

test('new quotations use the selected PDF but saved PDF/default snapshots do not follow later template changes', async () => {
  const { ContractTemplate } = require('../models');
  const { prepareQuotation } = require('./contract-templates');
  const original = { ...await validatePdf(await samplePdf()), id:'12345678-1234-4234-8234-123456789012',quoteType:'project' };
  const replacement = {...original,id:'22345678-1234-4234-8234-123456789012',fileName:'Replacement.pdf',sha256:'b'.repeat(64)};
  const template = {quoteType:'project',terms:'My saved default contract',source:'pdf',pdfId:original.id};
  mock.method(ContractTemplate,'findAll',async()=>[template]);
  mock.method(ContractFile,'findByPk',async id=>id===original.id?original:id===replacement.id?replacement:null);
  const input={title:'Project',clientName:'Client',quoteType:'project',currency:'PHP',issuedOn:'2026-10-26',validUntil:'2099-01-01',items:[{description:'Development',quantity:1,unitPrice:1000}]};
  try {
    const first=await prepareQuotation(input);
    assert.equal(first.contractSource,'pdf'); assert.equal(first.contractPdf.id,original.id); assert.equal(first.contractText,'');
    template.pdfId=replacement.id;
    assert.equal((await prepareQuotation(first)).contractPdf.id,original.id);
    assert.equal((await prepareQuotation(input)).contractPdf.id,replacement.id);
    const legacy=await prepareQuotation({...input,contractText:'Original saved default'});
    assert.equal(legacy.contractPdf,undefined);assert.equal(legacy.contractText,'Original saved default');
    assert.notEqual(documentHash(first),documentHash({...first,contractPdf:fileMetadata(replacement)}));
  } finally {mock.restoreAll();}
});
