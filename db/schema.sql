-- CVJ demo schema. Money is integer centavos. Dates are 'YYYY-MM-DD', times 'HH:MM'.
pragma foreign_keys = on;

create table if not exists units (
  id integer primary key,
  slug text not null unique,
  name text not null,
  kind text not null,
  capacity integer,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists customers (
  id integer primary key,
  name text not null,
  phone text,
  email text,
  company text,
  source text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists packages (
  id integer primary key,
  name text not null,
  price_per_pax integer not null,
  service_style text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists ingredients (
  id integer primary key,
  name text not null,
  uom text not null,
  cost_per_unit integer not null,
  par_level real not null default 0,
  fresh integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists menu_items (
  id integer primary key,
  name text not null,
  unit_id integer references units(id),
  price integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists package_items (
  id integer primary key,
  package_id integer not null references packages(id) on delete cascade,
  menu_item_id integer not null references menu_items(id),
  portions_per_pax real not null default 1,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists recipe_lines (
  id integer primary key,
  menu_item_id integer not null references menu_items(id) on delete cascade,
  ingredient_id integer not null references ingredients(id),
  qty_per_portion real not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists stock_movements (
  id integer primary key,
  ingredient_id integer not null references ingredients(id),
  date text not null,
  qty real not null,
  reason text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists inquiries (
  id integer primary key,
  customer_id integer not null references customers(id),
  unit_id integer not null references units(id),
  stage text not null check (stage in ('inquiry','site_visit','proposal_sent','booked','done','lost')),
  pax integer,
  target_date text,
  value_estimate integer,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists bookings (
  id integer primary key,
  customer_id integer not null references customers(id),
  unit_id integer not null references units(id),
  date text not null,
  start_time text not null,
  end_time text not null,
  pax integer not null,
  package_id integer not null references packages(id),
  venue_area text not null,
  status text not null check (status in ('inquiry','confirmed','done','cancelled')),
  notes text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists job_sheets (
  id integer primary key,
  booking_id integer not null unique references bookings(id) on delete cascade,
  service_style text not null,
  in_site integer not null default 1,
  pax integer not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists job_lines (
  id integer primary key,
  job_sheet_id integer not null references job_sheets(id) on delete cascade,
  menu_item_id integer not null references menu_items(id),
  qty real not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists production_runs (
  id integer primary key,
  date text not null unique,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists production_lines (
  id integer primary key,
  run_id integer not null references production_runs(id) on delete cascade,
  ingredient_id integer not null references ingredients(id),
  qty real not null,
  prepared integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (run_id, ingredient_id)
);

create table if not exists staff (
  id integer primary key,
  name text not null,
  unit_id integer not null references units(id),
  role text not null,
  hourly_rate integer not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists manpower_ratios (
  id integer primary key,
  role text not null unique,
  pax_per_head integer,
  fixed_count integer,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists shifts (
  id integer primary key,
  date text not null,
  start_time text not null,
  end_time text not null,
  unit_id integer not null references units(id),
  role text not null,
  staff_id integer references staff(id),
  booking_id integer references bookings(id) on delete cascade,
  overtime integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists invoices (
  id integer primary key,
  booking_id integer not null references bookings(id) on delete cascade,
  label text not null,
  amount integer not null,
  due_date text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists payments (
  id integer primary key,
  booking_id integer not null references bookings(id) on delete cascade,
  amount integer not null,
  paid_on text not null,
  method text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists expenses (
  id integer primary key,
  supplier text not null,
  unit_id integer not null references units(id),
  amount integer not null,
  due_date text not null,
  paid integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists court_bookings (
  id integer primary key,
  court integer not null,
  date text not null,
  hour integer not null,
  customer_id integer references customers(id),
  fee integer not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists parking_logs (
  id integer primary key,
  date text not null unique,
  vehicles integer not null,
  revenue integer not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists cafe_daily (
  id integer primary key,
  date text not null unique,
  sales integer not null,
  transactions integer not null,
  top_items text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists cash_closes (
  id integer primary key,
  unit_id integer not null references units(id),
  date text not null,
  expected integer not null,
  counted integer not null,
  variance integer not null,
  reason text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists approvals (
  id integer primary key,
  kind text not null,
  unit_id integer not null references units(id),
  requested_by text not null,
  amount integer not null,
  status text not null check (status in ('pending','approved','declined')),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create index if not exists idx_bookings_date on bookings(date);
create index if not exists idx_shifts_date on shifts(date);
create index if not exists idx_payments_paid_on on payments(paid_on);
create index if not exists idx_court_bookings_date on court_bookings(date);
