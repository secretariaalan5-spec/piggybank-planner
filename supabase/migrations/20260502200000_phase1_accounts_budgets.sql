
-- =========================================
-- ACCOUNTS (multi-conta)
-- =========================================
create table public.accounts (
  id          uuid    primary key default gen_random_uuid(),
  user_id     uuid    not null references auth.users(id) on delete cascade,
  name        text    not null,
  type        text    not null default 'checking',   -- checking|savings|credit|cash|investment
  balance     numeric(14,2) not null default 0,
  credit_limit numeric(14,2),
  color       text    not null default '#10b981',
  icon        text    not null default 'Wallet',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_accounts_user on public.accounts(user_id);
alter table public.accounts enable row level security;
create policy "Users manage own accounts"
  on public.accounts for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- =========================================
-- BUDGETS (orçamentos mensais)
-- =========================================
create table public.budgets (
  id          uuid    primary key default gen_random_uuid(),
  user_id     uuid    not null references auth.users(id) on delete cascade,
  category_id uuid    references public.categories(id) on delete cascade,
  amount      numeric(14,2) not null,
  month       smallint not null check (month between 1 and 12),
  year        smallint not null check (year >= 2020),
  created_at  timestamptz not null default now(),
  unique(user_id, category_id, month, year)
);

create index idx_budgets_user_period on public.budgets(user_id, year, month);
alter table public.budgets enable row level security;
create policy "Users manage own budgets"
  on public.budgets for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================
-- Expand TRANSACTIONS for accounts & installments
-- =========================================
alter table public.transactions
  add column if not exists account_id         uuid references public.accounts(id) on delete set null,
  add column if not exists source             text not null default 'manual',  -- manual|open_finance
  add column if not external_id        text,
  add column if not exists installment_total  smallint,
  add column if not exists installment_current smallint,
  add column if not exists recurrence         text,           -- monthly|weekly|yearly|null
  add column if not exists recurrence_end     date,
  add column if not exists parent_id          uuid references public.transactions(id) on delete cascade,
  add column if not exists notes              text;

create index if not exists idx_transactions_account on public.transactions(account_id);

-- =========================================
-- Auto-create default account on signup
-- (patch existing handle_new_user function)
-- =========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- profile
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  -- default account: Carteira (cash)
  insert into public.accounts (user_id, name, type, balance, color, icon)
  values (new.id, 'Carteira', 'cash', 0, '#10b981', 'Wallet');

  -- default categories
  insert into public.categories (user_id, name, icon, color, type) values
    (new.id, 'Salário',        'Briefcase',       '#10b981', 'income'),
    (new.id, 'Freelance',      'Laptop',          '#14b8a6', 'income'),
    (new.id, 'Investimentos',  'TrendingUp',      '#06b6d4', 'income'),
    (new.id, 'Alimentação',    'UtensilsCrossed', '#f59e0b', 'expense'),
    (new.id, 'Transporte',     'Car',             '#3b82f6', 'expense'),
    (new.id, 'Moradia',        'Home',            '#8b5cf6', 'expense'),
    (new.id, 'Lazer',          'Gamepad2',        '#ec4899', 'expense'),
    (new.id, 'Saúde',          'Heart',           '#ef4444', 'expense'),
    (new.id, 'Educação',       'GraduationCap',   '#6366f1', 'expense'),
    (new.id, 'Compras',        'ShoppingBag',     '#f97316', 'expense'),
    (new.id, 'Supermercado',   'ShoppingBag',     '#f97316', 'expense');

  return new;
end;
$$;
