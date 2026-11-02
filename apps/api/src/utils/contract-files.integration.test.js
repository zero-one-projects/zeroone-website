const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('PDF upload preserves defaults, freezes versions, and is used for client signing and signed copies', { skip: process.env.RUN_QUOTATION_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { PDFDocument } = require('pdf-lib');
  const crypto = require('crypto');
  const { sequelize } = require('../config/database');
  const { ContractTemplate, ContractFile, Quotation, QuotationVerification, QuotationResponseHistory, QuotationNotification } = require('../models');
  const { documentHash, codeHash } = require('./quotation-response');
  const files = [], quotations = [];
  const template = { quoteType:'project',terms:'My original editable default contract',format:{fontFamily:'Arial',blocks:[]},source:'default',pdfId:null,update:async(values)=>{Object.assign(template,values);return template;} };
  mock.method(ContractTemplate,'findAll',async()=>[template]);
  mock.method(ContractTemplate,'findByPk',async type=>type==='project'?template:null);
  mock.method(ContractTemplate,'findOrCreate',async()=>[template,false]);
  mock.method(ContractTemplate,'upsert',async(values)=>Object.assign(template,values));
  const createFile = ContractFile.create.bind(ContractFile);
  mock.method(ContractFile,'create',async(...args)=>{const row=await createFile(...args);files.push(row.id);return row;});
  const createQuote = Quotation.create.bind(Quotation);
  mock.method(Quotation,'create',async(...args)=>{const row=await createQuote(...args);quotations.push(row.id);return row;});
  mock.method(require('./quotation-notifications'),'queueNotificationDelivery',()=>{});
  sequelize.options.logging=false;
  const server=await new Promise(resolve=>{const instance=require('../app').listen(0,'127.0.0.1',()=>resolve(instance));});
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const admin=require('jsonwebtoken').sign({sub:'pdf-contract-test',role:1},process.env.JWT_SECRET,{expiresIn:'2m'});
  const headers={Authorization:`Bearer ${admin}`,'Content-Type':'application/json'};
  async function json(route,method='GET',body,authorized=true){const response=await fetch(base+route,{method,headers:authorized?headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};}
  async function upload(pageCount,authorized=true,invalid=false){const pdf=await PDFDocument.create();for(let i=0;i<pageCount;i++)pdf.addPage([450,650]).drawText(`Original page ${i+1}`);const data=new FormData();data.append('file',new Blob([invalid?Buffer.from('not a PDF'):await pdf.save()],{type:'application/pdf'}),invalid?'bad.pdf':'Uploaded contract.pdf');const response=await fetch(base+'/admin/contracts/project/pdf',{method:'POST',headers:authorized?{Authorization:`Bearer ${admin}`}:{},body:data});return {status:response.status,body:await response.json()};}
  try {
    assert.equal((await upload(2,false)).status,401);
    assert.equal((await upload(2,true,true)).status,400);
    const uploaded=await upload(2);assert.equal(uploaded.status,201);
    assert.equal(uploaded.body.templates.project,'My original editable default contract');
    assert.deepEqual(uploaded.body.formats.project,{fontFamily:'Arial',blocks:[]});
    const original=uploaded.body.contracts.project.pdf;assert.equal(original.pageCount,2);assert.equal(uploaded.body.contracts.project.source,'pdf');
    const privateFile=await fetch(`${base}/admin/contracts/files/${original.id}`);assert.equal(privateFile.status,401);
    const input={title:'PDF project',quoteType:'project',clientName:'Test Client',clientEmail:'client@example.com',currency:'PHP',issuedOn:'2026-10-26',validUntil:'2099-01-01',items:[{description:'Development',quantity:1,unitPrice:5000}]};
    const created=await json('/admin/quotations','POST',{document:input});assert.equal(created.status,201);
    assert.equal(created.body.quotation.document.contractPdf.id,original.id);
    const row=await Quotation.findByPk(created.body.quotation.id,{logging:false});
    const view=await fetch(`${base}/quotations/${row.shareToken}/contract-pdf`);assert.equal(view.status,200);
    const viewed=Buffer.from(await view.arrayBuffer());assert.equal(crypto.createHash('sha256').update(viewed).digest('hex'),original.sha256);
    const replaced=await upload(1);assert.equal(replaced.status,201);assert.notEqual(replaced.body.contracts.project.pdf.id,original.id);
    const saved=await json(`/admin/quotations/${row.id}`);assert.equal(saved.body.quotation.document.contractPdf.id,original.id);
    const currentFile=await fetch(`${base}/quotations/${row.shareToken}/contract-pdf`);assert.equal((await PDFDocument.load(await currentFile.arrayBuffer())).getPageCount(),2);
    const challengeId=crypto.randomUUID();await QuotationVerification.create({id:challengeId,quotationId:row.id,email:input.clientEmail,action:'accept',documentHash:documentHash(row.document),codeHash:codeHash(challengeId,'123456'),expiresAt:new Date(Date.now()+600000)},{logging:false});
    const verified=await json(`/quotations/${row.shareToken}/verify`,'POST',{challengeId,code:'123456'},false);assert.equal(verified.status,200);
    assert(verified.body.contractText.includes(original.sha256));
    const accepted=await json(`/quotations/${row.shareToken}/respond`,'POST',{challengeId,verificationProof:verified.body.verificationProof,action:'accept',name:'Client Name'},false);assert.equal(accepted.status,200);
    const signed=await json(`/quotations/${row.shareToken}/sign`,'POST',{challengeId,verificationProof:accepted.body.signingSession.verificationProof,name:'Client Name',signature:{type:'typed',typedName:'Client Name',agreed:true}},false);assert.equal(signed.status,200);
    const download=await fetch(`${base}/quotations/${row.shareToken}/signed-contract`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId,verificationProof:signed.body.signingSession.verificationProof})});assert.equal(download.status,200);
    const signedPdf=await PDFDocument.load(await download.arrayBuffer());assert.equal(signedPdf.getPageCount(),3);assert.equal(signedPdf.getPage(0).getWidth(),450);
    const copy=await fetch(base+'/admin/contracts/signed-copy',{method:'POST',headers,body:JSON.stringify({quotationId:row.id,documentHash:documentHash(row.document)})});assert.equal(copy.status,200);assert.equal((await PDFDocument.load(await copy.arrayBuffer())).getPageCount(),3);
    const jobs=await QuotationNotification.findAll({where:{quotationId:row.id},logging:false});assert.equal(jobs.find(job=>job.payload.action==='client_signed').payload.signedContract.document.contractPdf.id,original.id);
    const useDefault=await json('/admin/contracts/project','PUT',{source:'default'});assert.equal(useDefault.status,200);assert.equal(useDefault.body.templates.project,'My original editable default contract');assert.equal(useDefault.body.contracts.project.pdf.id,replaced.body.contracts.project.pdf.id);
    const builtin=await json('/admin/quotations','POST',{document:input});assert.equal(builtin.status,201);assert.equal(builtin.body.quotation.document.contractPdf,undefined);assert.equal(builtin.body.quotation.document.contractText,'My original editable default contract');
    await row.update({shareToken:null},{logging:false});assert.equal((await fetch(`${base}/quotations/${created.body.quotation.sharePath.split('/').at(-1)}/contract-pdf`)).status,404);
  } finally {
    if(quotations.length){await QuotationNotification.destroy({where:{quotationId:quotations},logging:false});await QuotationResponseHistory.destroy({where:{quotationId:quotations},logging:false});await QuotationVerification.destroy({where:{quotationId:quotations},logging:false});await Quotation.destroy({where:{id:quotations},force:true,logging:false});}
    if(files.length)await ContractFile.destroy({where:{id:files},logging:false});
    await new Promise(resolve=>server.close(resolve));await sequelize.close();mock.restoreAll();
  }
});
