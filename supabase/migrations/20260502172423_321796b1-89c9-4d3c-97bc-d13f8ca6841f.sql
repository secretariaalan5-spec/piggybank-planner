
-- =========================================
-- PROFILES
-- =========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- =========================================
-- CATEGORIES
-- =========================================
create type public.category_type as enum ('income', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'Wallet',
  color text not null default '#10b981',
  type public.category_type not null default 'expense',
  created_at timestamptz not null default now()
);

create index idx_categories_user on public.categories(user_id);

alter table public.categories enable row level security;

create policy "Users manage own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================
-- TRANSACTIONS
-- =========================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14,2) not null,
  description text,
  type public.category_type not null,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_transactions_user_date on public.transactions(user_id, date desc);

alter table public.transactions enable row level security;

create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================
-- GOALS
-- =========================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  deadline date,
  icon text not null default 'Target',
  color text not null default '#10b981',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_goals_user on public.goals(user_id);

alter table public.goals enable row level security;

create policy "Users manage own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================
-- AI INSIGHTS
-- =========================================
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  insight_type text not null default 'tip',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_insights_user on public.ai_insights(user_id, created_at desc);

alter table public.ai_insights enable row level security;

create policy "Users manage own insights"
  on public.ai_insights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================
-- updated_at trigger
-- =========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- =========================================
-- Auto-create profile + default categories on signup
-- =========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.categories (user_id, name, icon, color, type) values
    (new.id, 'Salário', 'Briefcase', '#10b981', 'income'),
    (new.id, 'Freelance', 'Laptop', '#14b8a6', 'income'),
    (new.id, 'Investimentos', 'TrendingUp', '#06b6d4', 'income'),
    (new.id, 'Alimentação', 'UtensilsCrossed', '#f59e0b', 'expense'),
    (new.id, 'Transporte', 'Car', '#3b82f6', 'expense'),
    (new.id, 'Moradia', 'Home', '#8b5cf6', 'expense'),
    (new.id, 'Lazer', 'Gamepad2', '#ec4899', 'expense'),
    (new.id, 'Saúde', 'Heart', '#ef4444', 'expense'),
    (new.id, 'Educação', 'GraduationCap', '#6366f1', 'expense'),
    (new.id, 'Compras', 'ShoppingBag', '#f97316', 'expense');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
