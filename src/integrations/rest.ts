import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import bodyParser from 'body-parser'
import { ensureStores } from '../store/ensure'
import { getFlag, setSetting, getSetting } from '../store/settings'
import { listReceipts, saveReceipt } from '../store/receipts'
import { recentLogs, log } from '../store/logs'
import { listMandates, createMandate, deleteMandate } from '../store/mandates'
import { requireLicense } from '../security/license'
import { payments, PaymentPlan } from '../payments'
import { startLoop, stopLoop } from '../loop/daemon'
import { startSynthetic, stopSynthetic } from '../loop/synthetic'
import { runDiagnostics } from '../loop/diagnostics'
import { readAwsConfig, saveAwsConfig } from './aws-config'
import { supabaseSync } from './supabase'
import { computeAnalytics } from './analytics'
import { receiptsToCSV } from './csv'
import { handleInbound, listInbound } from './webhooks'
import { readX402Config, saveX402Config } from './x402-config'

const app = express()
app.use(helmet())
app.use(cors({ origin: true }))

// capture raw body for HMAC
app.use(bodyParser.json({ verify: (req:any,_res,buf)=>{ (req as any).rawBody = buf.toString('utf8') } }))

// Basic in-memory rate limit per IP
const hits = new Map<string,{count:number, ts:number}>()
app.use((req,res,next)=>{
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'local'
  const now = Date.now()
  const rec = hits.get(ip) || { count: 0, ts: now }
  if (now - rec.ts > 15_000){ rec.count = 0; rec.ts = now }
  rec.count += 1; hits.set(ip, rec)
  if (rec.count > 120) return res.status(429).json({ error: 'rate_limited' })
  next()
})

app.use(requireLicense)
app.use(express.static('app'))

app.get('/api/health', (_req,res)=> res.json({ ok:true }))
app.get('/api/receipts', (_req,res)=> res.json(listReceipts(500)))

// Mandates
app.get('/api/mandates', (_req,res)=> res.json(listMandates()))
app.post('/api/mandates', (req,res)=>{
  const m = req.body || {}
  const created = createMandate({ issuer_did:m.issuerDID, subject_did:m.subjectDID, scope:m.scope, max_amount_minor:m.maxAmountMinor, currency:m.currency, expires_at:m.expiresAt })
  res.json(created)
})
app.delete('/api/mandates/:id', (req,res)=>{ deleteMandate(Number(req.params.id)); res.json({ ok:true }) })

// Execute payment
app.post('/api/execute', async (req,res)=>{
  try{
    const plan = (PaymentPlan as any).parse(req.body)
    const r = await payments.execute(plan)
    saveReceipt(r.rail, r.status, r)
    await supabaseSync('receipts', r).catch(()=>{})
    res.json(r)
  }catch(e:any){ res.status(400).json({ error: e.message || 'bad_request' }) }
})

// Loop & sandbox toggles
app.get('/api/admin/toggles', (_req,res)=>{
  res.json({
    LOOP_ENABLED: getFlag('LOOP_ENABLED'),
    SANDBOX_MODE: getFlag('SANDBOX_MODE'),
    SYNTHETIC_AGENTS: getFlag('SYNTHETIC_AGENTS'),
    SYNTHETIC_RATE: getSetting('SYNTHETIC_RATE') || '10',
    PAYMENTS_DRY_RUN: process.env.PAYMENTS_DRY_RUN !== 'false',
    X402_LIVE: process.env.X402_LIVE === 'true',
    VISA_AI_LIVE: process.env.VISA_AI_LIVE === 'true'
  })
})
app.put('/api/admin/toggles', async (req,res)=>{
  const { LOOP_ENABLED, SANDBOX_MODE, SYNTHETIC_AGENTS, SYNTHETIC_RATE } = req.body || {}
  if (typeof LOOP_ENABLED === 'boolean'){ setSetting('LOOP_ENABLED', LOOP_ENABLED?'true':'false'); if (LOOP_ENABLED) await startLoop(); else await stopLoop() }
  if (typeof SANDBOX_MODE === 'boolean') setSetting('SANDBOX_MODE', SANDBOX_MODE?'true':'false')
  if (typeof SYNTHETIC_AGENTS === 'boolean'){ setSetting('SYNTHETIC_AGENTS', SYNTHETIC_AGENTS?'true':'false'); if (SYNTHETIC_AGENTS) startSynthetic(); else stopSynthetic() }
  if (SYNTHETIC_RATE) setSetting('SYNTHETIC_RATE', String(SYNTHETIC_RATE))
  res.json({ ok:true })
})

// License rotation
app.put('/api/admin/license', async (req,res)=>{
  const { key } = req.body || {}; if(!key) return res.status(400).json({ error:'missing_key' })
  setSetting('LICENSE_KEY', String(key)); res.json({ ok:true })
})

// AWS config + simulate
app.get('/api/admin/aws-config', (_req,res)=> res.json({ config: readAwsConfig(true) }))
app.post('/api/admin/aws-config', (req,res)=>{ try{ saveAwsConfig(req.body||{}); res.json({ ok:true }) }catch(e:any){ res.status(400).json({ error:e.message }) } })
app.post('/api/admin/aws-simulate', (_req,res)=>{
  const cfg = readAwsConfig(false); if(!cfg) return res.status(400).json({ error:'no_config' })
  res.json({ ok:true, steps:[ 'Build Docker image','Push to ECR (region: '+cfg.region+')','Update ECS service','Sync app/ to S3 '+(cfg.s3Bucket||'(not set)'),'Create CloudFront invalidation '+(cfg.distributionId||'(not set)') ]})
})

// Coinbase x402 facilitator config
app.get('/api/admin/x402-config', (_req,res)=>{
  res.json({ config: readX402Config(true) })
})
app.post('/api/admin/x402-config', (req,res)=>{
  try{
    saveX402Config(req.body || {})
    res.json({ ok:true })
  }catch(e:any){
    res.status(400).json({ error: e.message || 'invalid_payload' })
  }
})

// Diagnostics
app.post('/api/admin/diagnostics', async (_req,res)=>{
  try{ const r = await runDiagnostics(); res.json({ ok:true, receipt:r }) }catch(e:any){ res.status(500).json({ ok:false, error: e.message||String(e) }) }
})

// Analytics + CSV
app.get('/api/analytics', (req,res)=>{
  const m = Math.max(5, Math.min(1440, parseInt(String((req.query as any).window||'60'),10) || 60))
  res.json(computeAnalytics(m))
})
app.get('/api/export/receipts.csv', (_req,res)=>{
  const csv = receiptsToCSV(2000)
  res.setHeader('Content-Type','text/csv')
  res.setHeader('Content-Disposition','attachment; filename="receipts.csv"')
  res.send(csv)
})

// Inbound webhook (HMAC verify)
app.post('/api/webhooks/inbound', (req:any,res)=>{
  try{
    const result = handleInbound(req.rawBody || '', req.headers || {}, req.query || {}, req.body || {})
    res.json(result)
  }catch(e:any){ res.status(400).json({ error: e.message || 'bad_request' }) }
})
app.get('/api/webhooks/inbound', (_req,res)=> res.json({ events: listInbound(100) }))

// SSE logs
app.get('/api/logs', (req,res)=>{
  res.setHeader('Content-Type','text/event-stream'); res.setHeader('Cache-Control','no-cache'); res.flushHeaders()
  let last = Date.now()-10000
  const t = setInterval(()=>{
    const rows = recentLogs(last)
    if (rows.length){ last=rows[rows.length-1].ts; rows.forEach(r=>res.write(`data: ${JSON.stringify(r)}\n\n`)) } else { res.write(': keep-alive\n\n') }
  }, 1000)
  req.on('close', ()=> clearInterval(t))
})

const port = Number(process.env.PORT||8787)
await ensureStores()
if (getFlag('SYNTHETIC_AGENTS')) startSynthetic()
if (getFlag('LOOP_ENABLED')) await startLoop()
app.listen(port, ()=> { console.log('All-in-One COMPLETE http://localhost:'+port); log('info','server started') })
