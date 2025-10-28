/*! Agentic embed button */
(()=>{
  function inject(){
    if(document.getElementById('agentic-toggle')) return;
    const b=document.createElement('button');
    b.id='agentic-toggle';
    b.textContent='Pay with Agent';
    Object.assign(b.style,{position:'fixed',right:'18px',bottom:'18px',padding:'10px 14px',borderRadius:'12px',border:'1px solid rgba(255,255,255,.2)',background:'linear-gradient(135deg,#111,#161b22)',color:'#e7e9ee',boxShadow:'0 8px 20px rgba(122,162,255,.25)',cursor:'pointer',zIndex:99999});
    b.onmouseenter=()=>b.style.transform='translateY(-2px)';
    b.onmouseleave=()=>b.style.transform='';
    b.onclick=async()=>{
      const amt=Number(prompt('Amount (minor units)','500'))||500;
      const to=prompt('Counterparty','cb:mlr')||'cb:mlr';
      const rail=prompt('Rail (X402|CARD)','X402')||'X402';
      const memo=prompt('Memo','')||undefined;
      const body={mandate:{issuerDID:'did:example:mlr',subjectDID:'did:example:recipient',scope:'TIP',maxAmountMinor:10000000,currency:'USDC',expiresAt:Date.now()+3600_000},intent:{amountMinor:amt,currency:'USDC',memo,counterparty:to,rail}};
      try{const r=await fetch('/api/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); alert(await r.text())}catch(e){alert('Error: '+e.message)}
    };
    document.body.appendChild(b);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',inject):inject();
})();