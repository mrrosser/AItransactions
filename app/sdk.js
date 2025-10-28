window.AgenticSDK = {
  async execute({ amountMinor=500, rail='X402', counterparty='cb:mlr', memo }={}){
    const body = {
      mandate:{ issuerDID:'did:example:mlr', subjectDID:'did:example:recipient', scope:'TIP', maxAmountMinor:10000000, currency:'USDC', expiresAt: Date.now()+3600_000 },
      intent:{ amountMinor, currency:'USDC', memo, counterparty, rail }
    }
    const r = await fetch('/api/execute', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }
};