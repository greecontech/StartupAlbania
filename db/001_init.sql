-- Greecon Platform — base schema (phase 1).
-- Covers D2 §5: users & roles, sites, data sources, metrics, readings,
-- alerts, audit, settings, and the Startup Albania project plan.

create extension if not exists pgcrypto;

create table users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  name           text not null,
  password_hash  text not null,
  role           text not null check (role in ('admin', 'operator', 'viewer')),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

create table sites (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  sector       text not null check (sector in ('energy', 'water', 'agriculture', 'other')),
  location     text not null default '',
  description  text not null default '',
  created_at   timestamptz not null default now()
);

create table data_sources (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references sites(id) on delete cascade,
  name            text not null,
  kind            text not null check (kind in ('device', 'api', 'manual', 'simulated')),
  api_key_hash    text,
  api_key_prefix  text,
  active          boolean not null default true,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index data_sources_site_idx on data_sources(site_id);
create unique index data_sources_key_prefix_idx on data_sources(api_key_prefix) where api_key_prefix is not null;

create table metrics (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references data_sources(id) on delete cascade,
  key            text not null,
  name           text not null,
  unit           text not null default '',
  min_threshold  double precision,
  max_threshold  double precision,
  created_at     timestamptz not null default now(),
  unique (source_id, key)
);

create table readings (
  id         bigserial primary key,
  metric_id  uuid not null references metrics(id) on delete cascade,
  ts         timestamptz not null,
  value      double precision not null,
  origin     text not null default 'api' check (origin in ('api', 'manual', 'import', 'simulated'))
);
create index readings_metric_ts_idx on readings(metric_id, ts desc);
create index readings_ts_idx on readings(ts desc);

create table alerts (
  id               uuid primary key default gen_random_uuid(),
  metric_id        uuid not null references metrics(id) on delete cascade,
  kind             text not null check (kind in ('above', 'below')),
  severity         text not null check (severity in ('warning', 'critical')),
  threshold        double precision not null,
  value            double precision not null,
  message          text not null,
  status           text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_at       timestamptz not null default now(),
  acknowledged_by  uuid references users(id) on delete set null,
  acknowledged_at  timestamptz,
  resolved_at      timestamptz
);
create index alerts_status_idx on alerts(status, created_at desc);
create index alerts_metric_idx on alerts(metric_id, status);

create table audit_events (
  id          bigserial primary key,
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_events_created_idx on audit_events(created_at desc);

create table settings (
  key    text primary key,
  value  jsonb not null
);

-- Startup Albania 2026 — Aneksi 1 activity plan and ToR deliverables (D1–D7).
create table project_items (
  id      text primary key,
  kind    text not null check (kind in ('result', 'activity', 'deliverable')),
  code    text not null,
  title   text not null,
  months  int[] not null default '{}',
  status  text not null default 'planned' check (status in ('planned', 'in_progress', 'done')),
  note    text not null default '',
  sort    int not null default 0
);
