-- Supabase bootstrap with indexes
create table if not exists public.mandates (
  id bigserial primary key,
  issuer_did text not null,
  subject_did text not null,
  scope text not null check (scope in ('TIP','PURCHASE','SUBSCRIPTION')),
  max_amount_minor bigint not null check (max_amount_minor > 0),
  currency text not null,
  expires_at bigint not null
);
create index if not exists idx_mandates_subject on public.mandates(subject_did);

create table if not exists public.receipts (
  id bigserial primary key,
  rail text not null check (rail in ('X402','CARD')),
  status text not null,
  payload jsonb not null,
  created_at timestamptz default now() not null
);
create index if not exists idx_receipts_created on public.receipts(created_at desc);
create index if not exists idx_receipts_rail on public.receipts(rail);

alter table public.mandates enable row level security;
alter table public.receipts enable row level security;
create policy if not exists p_mandates_read on public.mandates for select using (true);
create policy if not exists p_receipts_read on public.receipts for select using (true);
