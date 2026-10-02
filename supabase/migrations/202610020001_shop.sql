create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null,
  price_cents integer not null check (price_cents >= 0),
  image_url text not null,
  badge text,
  inventory integer not null default 0 check (inventory >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 25),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  customer_email text not null,
  customer_name text not null,
  shipping_address jsonb not null,
  status text not null default 'placed' check (status in ('placed','processing','shipped','cancelled')),
  subtotal_cents integer not null,
  shipping_cents integer not null,
  total_cents integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Anyone can read active products" on public.products for select using (active = true);
create policy "Customers manage their own cart" on public.cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Customers read their own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Customers read items from their orders" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);

create or replace function public.place_order(p_customer_name text, p_shipping_address jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  new_order_id uuid;
  item jsonb;
  normalized_items jsonb;
  product_record public.products%rowtype;
  item_quantity integer;
  subtotal integer := 0;
  shipping integer;
begin
  if current_user_id is null then raise exception 'Sign in to place an order'; end if;
  select email into current_email from auth.users where id = current_user_id;
  if current_email is null then raise exception 'An email address is required'; end if;
  if length(trim(p_customer_name)) < 2 or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Please provide your name and at least one item';
  end if;

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity) order by product_id)
    into normalized_items
    from (
      select product_id, sum(quantity)::integer as quantity
      from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer)
      group by product_id
    ) as grouped_items;

  for item in select value from jsonb_array_elements(normalized_items) loop
    item_quantity := (item->>'quantity')::integer;
    if item_quantity is null or item_quantity < 1 or item_quantity > 25 then raise exception 'Invalid item quantity'; end if;
    select * into product_record from public.products
      where id = (item->>'product_id')::uuid and active = true for update;
    if not found then raise exception 'A product is no longer available'; end if;
    if product_record.inventory < item_quantity then raise exception 'Not enough inventory for %', product_record.name; end if;
    subtotal := subtotal + product_record.price_cents * item_quantity;
  end loop;

  shipping := case when subtotal >= 7500 then 0 else 700 end;
  insert into public.orders (user_id, customer_email, customer_name, shipping_address, subtotal_cents, shipping_cents, total_cents)
    values (current_user_id, current_email, trim(p_customer_name), p_shipping_address, subtotal, shipping, subtotal + shipping)
    returning id into new_order_id;

  for item in select value from jsonb_array_elements(normalized_items) loop
    item_quantity := (item->>'quantity')::integer;
    select * into product_record from public.products where id = (item->>'product_id')::uuid for update;
    update public.products set inventory = inventory - item_quantity where id = product_record.id;
    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price_cents)
      values (new_order_id, product_record.id, product_record.name, item_quantity, product_record.price_cents);
    delete from public.cart_items where user_id = current_user_id and product_id = product_record.id;
  end loop;
  return new_order_id;
end;
$$;

revoke all on function public.place_order(text, jsonb, jsonb) from public;
grant execute on function public.place_order(text, jsonb, jsonb) to authenticated;

insert into public.products (slug,name,description,category,price_cents,image_url,badge,inventory,sort_order) values
('daily-ceramic-cup','Daily ceramic cup','Hand-thrown stoneware · 320 ml','Table',2800,'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=85','BESTSELLER',24,1),
('linen-market-tote','Linen market tote','Washed European linen · oat','Carry',4200,'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85','JUST IN',18,2),
('morning-pour-over','Morning pour-over','Glazed porcelain · warm white','Ritual',3600,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85',null,30,3),
('field-notes-set','Field notes set','Three pocket notebooks · recycled','Paper',1800,'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=1000&q=85',null,40,4)
on conflict (slug) do nothing;