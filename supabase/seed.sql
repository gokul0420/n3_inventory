-- ============================================================================
-- Mavericks Inventory — seed data (OPTIONAL, for demo parity with mockData.js)
-- Run AFTER schema.sql. User-FK columns (submitted_by/approved_by) are left
-- NULL because those reference profiles, which only exist once people sign up.
-- ============================================================================

insert into public.stock_items (id, code, name, category, location, quantity, threshold, unit, status, created_at, updated_at) values
('STK001','STK001','Laptop Dell Latitude 5540','Electronics','Warehouse A',45,10,'Units','active','2026-03-15','2026-04-28'),
('STK002','STK002','Office Chair Ergonomic Pro','Furniture','Warehouse B',8,15,'Units','active','2026-03-15','2026-04-20'),
('STK003','STK003','A4 Paper (80 GSM)','Stationery','HQ Store',200,50,'Reams','active','2026-03-16','2026-05-01'),
('STK004','STK004','Safety Helmet Type-II','Safety Equipment','Warehouse A',5,20,'Units','active','2026-03-18','2026-04-30'),
('STK005','STK005','Wireless Mouse Logitech M720','IT Hardware','HQ Store',120,30,'Units','active','2026-03-20','2026-04-25'),
('STK006','STK006','Floor Cleaner (5L)','Cleaning Supplies','Warehouse B',3,10,'Bottles','active','2026-03-22','2026-04-15'),
('STK007','STK007','Monitor 27" 4K Dell','Electronics','Warehouse A',30,8,'Units','active','2026-03-25','2026-05-02'),
('STK008','STK008','Standing Desk Frame','Furniture','Warehouse A',12,5,'Units','active','2026-04-01','2026-04-28'),
('STK009','STK009','Printer Toner HP 26A','Stationery','HQ Store',4,8,'Cartridges','active','2026-04-05','2026-04-30'),
('STK010','STK010','Fire Extinguisher ABC Type','Safety Equipment','Warehouse B',18,5,'Units','active','2026-04-10','2026-05-01'),
('STK011','STK011','USB-C Hub Multiport','IT Hardware','HQ Store',2,15,'Units','active','2026-04-12','2026-04-29'),
('STK012','STK012','Hand Sanitizer (500ml)','Cleaning Supplies','HQ Store',50,20,'Bottles','active','2026-04-15','2026-05-01')
on conflict (id) do nothing;

insert into public.distributions (id, stock_id, stock_name, quantity, recipient, date, status, remarks) values
('DST001','STK001','Laptop Dell Latitude 5540',5,'Branch Office Delhi','2026-04-25','approved','Quarterly refresh'),
('DST007','STK002','Office Chair Ergonomic Pro',4,'Branch Office Mumbai','2026-03-15','approved','Office expansion'),
('DST008','STK004','Safety Helmet Type-II',8,'Warehouse B','2026-03-20','approved','Site safety requirement'),
('DST009','STK006','Floor Cleaner (5L)',5,'HQ Store','2026-03-25','approved','Monthly cleaning supplies'),
('DST010','STK009','Printer Toner HP 26A',3,'Branch Office Delhi','2026-04-01','approved','Printer maintenance'),
('DST011','STK011','USB-C Hub Multiport',6,'HQ Store','2026-04-05','approved','IT equipment refresh'),
('DST012','STK001','Laptop Dell Latitude 5540',8,'Branch Office Mumbai','2026-03-28','approved','New hire onboarding'),
('DST013','STK004','Safety Helmet Type-II',5,'Branch Office Delhi','2026-04-10','approved','Safety compliance'),
('DST014','STK006','Floor Cleaner (5L)',4,'Warehouse A','2026-04-18','approved','Restocking'),
('DST015','STK009','Printer Toner HP 26A',2,'HQ Store','2026-04-22','approved','Emergency replacement'),
('DST016','STK011','USB-C Hub Multiport',4,'Branch Office Mumbai','2026-04-28','approved','IT provisioning')
on conflict (id) do nothing;
