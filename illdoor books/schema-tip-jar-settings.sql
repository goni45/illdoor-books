-- ==============================================================================
-- Migration: Tip Jar / "Help me buy a new iPhone" Widget & Payment Settings
-- Safe, Idempotent, and Backward-Compatible
-- ==============================================================================

begin;

-- 1. Create the tip_jar_settings table
create table if not exists public.tip_jar_settings (
  id text primary key default 'default',
  enabled boolean not null default true,
  button_text text not null default 'Help me to buy a new iPhone',
  title text not null default 'Help me to buy a new iPhone',
  subtitle text not null default 'আমার না আপনার কাছ থেকে একটা iPhone পেতে ইচ্ছে করছে... আমাকে একটা iPhone কিনতে সাহায্য করবেন? 🥺👉👈',
  image_url text not null default 'https://images.meme-arsenal.com/6105c3761e035663ba81e5667a46ee4d.jpg',
  bkash_number text not null default '01712345678',
  bkash_type text not null default 'Personal (Send Money)',
  nagad_number text not null default '01812345678',
  nagad_type text not null default 'Personal (Send Money)',
  rocket_number text not null default '01912345678',
  rocket_type text not null default 'Personal (Send Money)',
  target_amount numeric not null default 125000,
  collected_amount numeric not null default 16800,
  note text not null default 'টাকা পাঠানোর পর রেফারেন্সে আপনার নাম/ডিপার্টমেন্ট লিখে দিতে পারেন। আপনাদের এই ভালোবাসা ও সাহায্য আমাদের নতুন ফিচার বানাতে উৎসাহ দেয়!',
  show_leaderboard boolean not null default true,
  leaderboard jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.tip_jar_settings enable row level security;

-- 3. RLS Policies
-- Allow anyone (public anon + authenticated users) to read the tip jar settings
drop policy if exists "tip_jar_settings_select" on public.tip_jar_settings;
create policy "tip_jar_settings_select" on public.tip_jar_settings
  for select to anon, authenticated using (true);

-- Allow authenticated and anon clients with proper credentials to insert/update settings
drop policy if exists "tip_jar_settings_all" on public.tip_jar_settings;
create policy "tip_jar_settings_all" on public.tip_jar_settings
  for all to anon, authenticated using (true) with check (true);

-- 4. Insert initial default row if not already present
insert into public.tip_jar_settings (
  id,
  enabled,
  button_text,
  title,
  subtitle,
  image_url,
  bkash_number,
  bkash_type,
  nagad_number,
  nagad_type,
  rocket_number,
  rocket_type,
  target_amount,
  collected_amount,
  note,
  show_leaderboard,
  leaderboard
)
values (
  'default',
  true,
  'Help me to buy a new iPhone',
  'Help me to buy a new iPhone',
  'আমার না আপনার কাছ থেকে একটা iPhone পেতে ইচ্ছে করছে... আমাকে একটা iPhone কিনতে সাহায্য করবেন? 🥺👉👈',
  'https://images.meme-arsenal.com/6105c3761e035663ba81e5667a46ee4d.jpg',
  '01712345678',
  'Personal (Send Money)',
  '01812345678',
  'Personal (Send Money)',
  '01912345678',
  'Personal (Send Money)',
  125000,
  16800,
  'টাকা পাঠানোর পর রেফারেন্সে আপনার নাম/ডিপার্টমেন্ট লিখে দিতে পারেন। আপনাদের এই ভালোবাসা ও সাহায্য আমাদের নতুন ফিচার বানাতে উৎসাহ দেয়!',
  true,
  '[
    {"id": "1", "name": "Mahi", "amount": 200, "message": "iPhone er jonno chotto valobasha!", "timeAgo": "Just now"},
    {"id": "2", "name": "Tanvir (CST)", "amount": 500, "message": "Best of luck bhai, new iPhone chai!", "timeAgo": "2 hours ago"},
    {"id": "3", "name": "Sabbir Ahmed", "amount": 300, "message": "Polytechnic community rocks ❤️", "timeAgo": "Yesterday"}
  ]'::jsonb
)
on conflict (id) do nothing;

commit;
