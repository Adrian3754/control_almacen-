create table if not exists public.inventory_push_subscriptions (
  endpoint text primary key,
  employee_number text not null,
  p256dh text not null,
  auth text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_push_subscriptions_employee_expiry_idx
  on public.inventory_push_subscriptions (employee_number, expires_at);

alter table public.inventory_push_subscriptions enable row level security;

revoke all on public.inventory_push_subscriptions from anon, authenticated;
grant all on public.inventory_push_subscriptions to service_role;
