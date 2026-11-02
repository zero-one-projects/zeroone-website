// Keep the last pre-history response too, so installing history loses no existing data.
function responseHistory(row, records) {
  const responses = records.map((record) => record.response);
  if (row.clientResponse && !responses.some((response) => response.documentHash === row.clientResponse.documentHash)) {
    responses.push(row.clientResponse);
  }
  return responses.sort((a, b) => Date.parse(b.respondedAt) - Date.parse(a.respondedAt));
}

async function recordResponse(History, row, response, transaction) {
  for (const entry of [row.clientResponse, response].filter(Boolean)) {
    await History.findOrCreate({
      where: { quotationId: row.id, documentHash: entry.documentHash },
      defaults: { response: entry }, transaction, logging: false
    });
  }
}

module.exports = { responseHistory, recordResponse };
