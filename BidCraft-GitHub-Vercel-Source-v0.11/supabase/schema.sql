-- BidCraft Supabase starter schema
-- Run this in Supabase SQL Editor before wiring the app to Supabase Auth.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies
  add column if not exists settings jsonb not null default '{}'::jsonb;

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'estimator'
    check (role in ('owner', 'admin', 'estimator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.company_join_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  unique (company_id, user_id)
);

create table if not exists public.company_price_book_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item text not null,
  trade text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  client text,
  status text not null default 'Draft',
  proposal_number text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_members_user_id
  on public.company_members (user_id);
create index if not exists idx_join_requests_company_status
  on public.company_join_requests (company_id, status);
create index if not exists idx_price_book_company
  on public.company_price_book_items (company_id, trade);
create index if not exists idx_projects_company_status
  on public.company_projects (company_id, status);
create index if not exists idx_audit_company_created
  on public.audit_logs (company_id, created_at desc);
create index if not exists idx_audit_actor_created
  on public.audit_logs (actor_user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_platform_admin = true
  );
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.company_members
      where company_id = target_company_id
        and user_id = auth.uid()
    );
$$;

create or replace function public.has_company_role(
  target_company_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.company_members
      where company_id = target_company_id
        and user_id = auth.uid()
        and role = any(allowed_roles)
    );
$$;

create or replace function public.create_company(company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  clean_name text;
begin
  clean_name = nullif(trim(company_name), '');
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if clean_name is null then
    raise exception 'Company name is required';
  end if;

  insert into public.companies (name, created_by)
  values (clean_name, auth.uid())
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, auth.uid(), 'owner');

  insert into public.audit_logs (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    new_company_id,
    auth.uid(),
    'create',
    'company',
    new_company_id,
    jsonb_build_object('name', clean_name)
  );

  return new_company_id;
end;
$$;

create or replace function public.rename_company(
  target_company_id uuid,
  company_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
begin
  clean_name = nullif(trim(company_name), '');
  if clean_name is null then
    raise exception 'Company name is required';
  end if;

  if not public.has_company_role(target_company_id, array['owner', 'admin']) then
    raise exception 'Only company owners and admins can rename a company';
  end if;

  update public.companies
  set
    name = clean_name,
    settings = jsonb_set(
      coalesce(settings, '{}'::jsonb),
      '{company,name}',
      to_jsonb(clean_name),
      true
    )
  where id = target_company_id;
end;
$$;

create or replace function public.delete_company(target_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_name text;
begin
  if not public.has_company_role(target_company_id, array['owner']) then
    raise exception 'Only company owners can delete a company';
  end if;

  select name into target_name
  from public.companies
  where id = target_company_id;

  if target_name is null then
    raise exception 'Company not found';
  end if;

  insert into public.audit_logs (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data
  )
  values (
    null,
    auth.uid(),
    'delete',
    'companies',
    target_company_id,
    jsonb_build_object('name', target_name)
  );

  delete from public.companies
  where id = target_company_id;
end;
$$;

create or replace function public.list_my_companies()
returns table (
  company_id uuid,
  company_name text,
  company_role text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_platform_admin() then
    return query
      select c.id, c.name, 'platform_admin'::text
      from public.companies c
      order by c.name;
  else
    return query
      select c.id, c.name, cm.role
      from public.company_members cm
      join public.companies c on c.id = cm.company_id
      where cm.user_id = auth.uid()
      order by c.name;
  end if;
end;
$$;

create or replace function public.search_companies(search_term text)
returns table (
  company_id uuid,
  company_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name
  from public.companies c
  where auth.uid() is not null
    and length(trim(search_term)) >= 2
    and c.name ilike '%' || trim(search_term) || '%'
  order by c.name
  limit 20;
$$;

create or replace function public.request_join_company(target_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
begin
  insert into public.company_join_requests (company_id, user_id)
  values (target_company_id, auth.uid())
  on conflict (company_id, user_id)
  do update set status = 'pending', reviewed_by = null, reviewed_at = null
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.list_join_requests(target_company_id uuid)
returns table (
  request_id uuid,
  user_id uuid,
  email text,
  full_name text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.user_id,
    p.email,
    p.full_name,
    r.status,
    r.created_at
  from public.company_join_requests r
  left join public.profiles p on p.id = r.user_id
  where r.company_id = target_company_id
    and r.status = 'pending'
    and public.has_company_role(target_company_id, array['owner', 'admin'])
  order by r.created_at asc;
$$;

create or replace function public.list_company_members(target_company_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cm.user_id,
    p.email,
    p.full_name,
    cm.role,
    cm.created_at
  from public.company_members cm
  left join public.profiles p on p.id = cm.user_id
  where cm.company_id = target_company_id
    and public.is_company_member(target_company_id)
  order by
    case cm.role
      when 'owner' then 1
      when 'admin' then 2
      when 'estimator' then 3
      else 4
    end,
    coalesce(p.full_name, p.email);
$$;

create or replace function public.update_company_member_role(
  target_company_id uuid,
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_role text;
  acting_role text;
  acting_platform_admin boolean;
  target_current_role text;
  owner_count integer;
begin
  clean_role = nullif(trim(new_role), '');
  if clean_role not in ('owner', 'admin', 'estimator', 'viewer') then
    raise exception 'Invalid member role';
  end if;

  if not public.has_company_role(target_company_id, array['owner', 'admin']) then
    raise exception 'Only company owners and admins can change roles';
  end if;

  acting_platform_admin = public.is_platform_admin();
  select role into acting_role
  from public.company_members
  where company_id = target_company_id
    and user_id = auth.uid();

  select role into target_current_role
  from public.company_members
  where company_id = target_company_id
    and user_id = target_user_id;

  if target_current_role is null then
    raise exception 'Company member not found';
  end if;

  if not acting_platform_admin
    and clean_role = 'owner'
    and coalesce(acting_role, '') <> 'owner' then
    raise exception 'Only owners can assign the owner role';
  end if;

  if not acting_platform_admin
    and target_current_role = 'owner'
    and coalesce(acting_role, '') <> 'owner' then
    raise exception 'Only owners can change another owner';
  end if;

  if target_current_role = 'owner' and clean_role <> 'owner' then
    select count(*) into owner_count
    from public.company_members
    where company_id = target_company_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'A company must keep at least one owner';
    end if;
  end if;

  update public.company_members
  set role = clean_role
  where company_id = target_company_id
    and user_id = target_user_id;

  insert into public.audit_logs (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values (
    target_company_id,
    auth.uid(),
    'update_role',
    'company_members',
    target_user_id,
    jsonb_build_object('role', target_current_role),
    jsonb_build_object('role', clean_role)
  );
end;
$$;

create or replace function public.remove_company_member(
  target_company_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_role text;
  acting_platform_admin boolean;
  target_current_role text;
  owner_count integer;
begin
  if not public.has_company_role(target_company_id, array['owner', 'admin']) then
    raise exception 'Only company owners and admins can remove members';
  end if;

  acting_platform_admin = public.is_platform_admin();
  select role into acting_role
  from public.company_members
  where company_id = target_company_id
    and user_id = auth.uid();

  select role into target_current_role
  from public.company_members
  where company_id = target_company_id
    and user_id = target_user_id;

  if target_current_role is null then
    raise exception 'Company member not found';
  end if;

  if not acting_platform_admin
    and target_current_role = 'owner'
    and coalesce(acting_role, '') <> 'owner' then
    raise exception 'Only owners can remove another owner';
  end if;

  if target_current_role = 'owner' then
    select count(*) into owner_count
    from public.company_members
    where company_id = target_company_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'A company must keep at least one owner';
    end if;
  end if;

  delete from public.company_members
  where company_id = target_company_id
    and user_id = target_user_id;

  insert into public.audit_logs (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data
  )
  values (
    target_company_id,
    auth.uid(),
    'remove_member',
    'company_members',
    target_user_id,
    jsonb_build_object('role', target_current_role)
  );
end;
$$;

create or replace function public.review_join_request(
  target_request_id uuid,
  approve boolean,
  member_role text default 'estimator'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company_id uuid;
  target_user_id uuid;
  clean_role text;
begin
  select company_id, user_id
    into target_company_id, target_user_id
  from public.company_join_requests
  where id = target_request_id
    and status = 'pending';

  if target_company_id is null then
    raise exception 'Join request not found';
  end if;

  if not public.has_company_role(target_company_id, array['owner', 'admin']) then
    raise exception 'Not allowed to review this request';
  end if;

  clean_role = coalesce(nullif(member_role, ''), 'estimator');
  if clean_role not in ('owner', 'admin', 'estimator', 'viewer') then
    raise exception 'Invalid member role';
  end if;

  if approve then
    update public.company_join_requests
    set status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = target_request_id;

    insert into public.company_members (company_id, user_id, role)
    values (target_company_id, target_user_id, clean_role)
    on conflict (company_id, user_id)
    do update set role = excluded.role;
  else
    update public.company_join_requests
    set status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = target_request_id;
  end if;

  insert into public.audit_logs (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    target_company_id,
    auth.uid(),
    case when approve then 'approve_join_request' else 'reject_join_request' end,
    'company_join_requests',
    target_request_id,
    jsonb_build_object('user_id', target_user_id, 'role', clean_role)
  );
end;
$$;

create or replace function public.audit_company_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_company_id uuid;
  row_entity_id uuid;
begin
  if tg_op = 'DELETE' then
    row_company_id = old.company_id;
    row_entity_id = old.id;
  else
    row_company_id = new.company_id;
    row_entity_id = new.id;
  end if;

  insert into public.audit_logs (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values (
    row_company_id,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    row_entity_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.audit_company_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_company_id uuid;
begin
  if tg_op = 'DELETE' then
    row_company_id = old.id;
  else
    row_company_id = new.id;
  end if;

  insert into public.audit_logs (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values (
    row_company_id,
    auth.uid(),
    lower(tg_op),
    'companies',
    row_company_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists touch_companies on public.companies;
create trigger touch_companies
before update on public.companies
for each row execute function public.touch_updated_at();

drop trigger if exists audit_company_settings on public.companies;
create trigger audit_company_settings
after update on public.companies
for each row execute function public.audit_company_settings();

drop trigger if exists touch_price_book_items on public.company_price_book_items;
create trigger touch_price_book_items
before update on public.company_price_book_items
for each row execute function public.touch_updated_at();

drop trigger if exists touch_projects on public.company_projects;
create trigger touch_projects
before update on public.company_projects
for each row execute function public.touch_updated_at();

drop trigger if exists audit_price_book_items on public.company_price_book_items;
create trigger audit_price_book_items
after insert or update or delete on public.company_price_book_items
for each row execute function public.audit_company_row();

drop trigger if exists audit_projects on public.company_projects;
create trigger audit_projects
after insert or update or delete on public.company_projects
for each row execute function public.audit_company_row();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_join_requests enable row level security;
alter table public.company_price_book_items enable row level security;
alter table public.company_projects enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_platform_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "companies_select_members" on public.companies;
create policy "companies_select_members"
on public.companies for select
using (public.is_company_member(id));

drop policy if exists "companies_insert_authenticated" on public.companies;
create policy "companies_insert_authenticated"
on public.companies for insert
with check (auth.uid() = created_by);

drop policy if exists "companies_update_admins" on public.companies;
create policy "companies_update_admins"
on public.companies for update
using (public.has_company_role(id, array['owner', 'admin']))
with check (public.has_company_role(id, array['owner', 'admin']));

drop policy if exists "companies_delete_owners" on public.companies;
create policy "companies_delete_owners"
on public.companies for delete
using (public.has_company_role(id, array['owner']));

drop policy if exists "members_select_same_company" on public.company_members;
create policy "members_select_same_company"
on public.company_members for select
using (public.is_company_member(company_id));

drop policy if exists "members_manage_company_admins" on public.company_members;
create policy "members_manage_company_admins"
on public.company_members for all
using (public.has_company_role(company_id, array['owner', 'admin']))
with check (public.has_company_role(company_id, array['owner', 'admin']));

drop policy if exists "join_requests_select_related" on public.company_join_requests;
create policy "join_requests_select_related"
on public.company_join_requests for select
using (
  user_id = auth.uid()
  or public.has_company_role(company_id, array['owner', 'admin'])
);

drop policy if exists "join_requests_insert_self" on public.company_join_requests;
create policy "join_requests_insert_self"
on public.company_join_requests for insert
with check (user_id = auth.uid());

drop policy if exists "join_requests_review_admins" on public.company_join_requests;
create policy "join_requests_review_admins"
on public.company_join_requests for update
using (public.has_company_role(company_id, array['owner', 'admin']))
with check (public.has_company_role(company_id, array['owner', 'admin']));

drop policy if exists "price_book_member_select" on public.company_price_book_items;
create policy "price_book_member_select"
on public.company_price_book_items for select
using (public.is_company_member(company_id));

drop policy if exists "price_book_estimators_write" on public.company_price_book_items;
drop policy if exists "price_book_admins_write" on public.company_price_book_items;
create policy "price_book_admins_write"
on public.company_price_book_items for all
using (public.has_company_role(company_id, array['owner', 'admin']))
with check (public.has_company_role(company_id, array['owner', 'admin']));

drop policy if exists "projects_member_select" on public.company_projects;
create policy "projects_member_select"
on public.company_projects for select
using (public.is_company_member(company_id));

drop policy if exists "projects_estimators_write" on public.company_projects;
create policy "projects_estimators_write"
on public.company_projects for all
using (public.has_company_role(company_id, array['owner', 'admin', 'estimator']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'estimator']));

drop policy if exists "audit_logs_member_select" on public.audit_logs;
create policy "audit_logs_member_select"
on public.audit_logs for select
using (public.is_company_member(company_id));

grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.companies to authenticated;
grant select, insert, update, delete on table public.company_members to authenticated;
grant select, insert, update, delete on table public.company_join_requests to authenticated;
grant select, insert, update, delete on table public.company_price_book_items to authenticated;
grant select, insert, update, delete on table public.company_projects to authenticated;
grant select on table public.audit_logs to authenticated;

revoke all on function public.create_company(text) from public, anon;
revoke all on function public.rename_company(uuid, text) from public, anon;
revoke all on function public.delete_company(uuid) from public, anon;
revoke all on function public.list_my_companies() from public, anon;
revoke all on function public.search_companies(text) from public, anon;
revoke all on function public.request_join_company(uuid) from public, anon;
revoke all on function public.list_join_requests(uuid) from public, anon;
revoke all on function public.list_company_members(uuid) from public, anon;
revoke all on function public.update_company_member_role(uuid, uuid, text) from public, anon;
revoke all on function public.remove_company_member(uuid, uuid) from public, anon;
revoke all on function public.review_join_request(uuid, boolean, text) from public, anon;

grant execute on function public.create_company(text) to authenticated;
grant execute on function public.rename_company(uuid, text) to authenticated;
grant execute on function public.delete_company(uuid) to authenticated;
grant execute on function public.list_my_companies() to authenticated;
grant execute on function public.search_companies(text) to authenticated;
grant execute on function public.request_join_company(uuid) to authenticated;
grant execute on function public.list_join_requests(uuid) to authenticated;
grant execute on function public.list_company_members(uuid) to authenticated;
grant execute on function public.update_company_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_company_member(uuid, uuid) to authenticated;
grant execute on function public.review_join_request(uuid, boolean, text) to authenticated;
