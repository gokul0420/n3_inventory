-- ============================================================================
-- Reset inventory to department-specific products only.
-- Run in Supabase SQL Editor. This CLEARS all products + related demo
-- transactions, then seeds the new Hexavarsity / STG catalog.
-- ============================================================================

-- 1. Clear dependent demo data first (so distribution testing starts clean).
delete from public.reorder_requests;
delete from public.employee_allocations;
delete from public.distributions;

-- 2. Remove ALL existing products (paper, printer, old seed items, everything).
delete from public.stock_items;

-- 3. Seed Hexavarsity products
insert into public.stock_items (id, code, name, category, location, quantity, threshold, unit, status, department_id)
select v.id, v.id, v.name, 'Merchandise', 'Hexavarsity Store', v.qty, v.thr, 'Units', 'active', d.id
from (values
  ('HEX001','Coffee Mug',150,30),
  ('HEX002','Logitech Wireless Mouse',100,20),
  ('HEX003','T-Shirt',200,40),
  ('HEX004','Wireless Headphones',80,15)
) as v(id,name,qty,thr)
cross join (select id from public.departments where name='Hexavarsity') d;

-- 4. Seed STG products
insert into public.stock_items (id, code, name, category, location, quantity, threshold, unit, status, department_id)
select v.id, v.id, v.name, 'IT Equipment', 'STG Warehouse', v.qty, v.thr, 'Units', 'active', d.id
from (values
  ('STG001','Dell Laptop',50,10),
  ('STG002','Lenovo ThinkPad',40,10),
  ('STG003','Mac (MacBook)',30,8),
  ('STG004','Laptop Bag',120,25)
) as v(id,name,qty,thr)
cross join (select id from public.departments where name='STG') d;

-- 5. Verify
select d.name as department, s.code, s.name, s.quantity, s.threshold
from public.stock_items s
join public.departments d on d.id = s.department_id
order by d.name, s.code;
