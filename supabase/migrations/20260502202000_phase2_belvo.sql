-- =========================================
-- BANK CONNECTIONS (Belvo Links)
-- =========================================
create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'belvo',
  link_id text not null unique,              -- ID of the Link in Belvo
  institution_name text not null,            -- e.g., "Nubank", "Itaú"
  institution_logo text,
  status text not null default 'active',     -- 'active', 'invalid', 'pending'
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bank_connections_user on public.bank_connections(user_id);

alter table public.bank_connections enable row level security;
create policy "Users manage own bank connections"
  on public.bank_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger trg_bank_connections_updated_at
  before update on public.bank_connections
  for each row execute function public.set_updated_at();

-- =========================================
-- BANK ACCOUNTS (Imported from Belvo)
-- =========================================
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null unique,          -- ID of the account in Belvo
  name text not null,
  type text not null,                        -- 'CHECKING_ACCOUNT', 'CREDIT_CARD', etc
  balance numeric(14,2) not null default 0,
  currency text not null default 'BRL',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bank_accounts_user on public.bank_accounts(user_id);
create index idx_bank_accounts_connection on public.bank_accounts(connection_id);

alter table public.bank_accounts enable row level security;
create policy "Users manage own bank accounts"
  on public.bank_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger trg_bank_accounts_updated_at
  before update on public.bank_accounts
  for each row execute function public.set_updated_at();

-- Add bank_account_id to transactions
alter table public.transactions add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null;
