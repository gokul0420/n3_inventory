// Data-access layer: maps the app's camelCase objects to/from Supabase
// snake_case rows, exposes CRUD per table, and a realtime subscription helper.
import { supabase } from '../lib/supabaseClient.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// FK columns that reference profiles(id) — must be a uuid or NULL.
const UUID_FIELDS = new Set([
  'submittedBy', 'approvedBy', 'requestedBy', 'reviewedBy', 'createdBy',
]);

// Auto-generated identity PKs — never send on insert.
const AUTO_ID_TABLES = new Set(['audit_logs', 'notifications']);

const toSnake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export function rowToApp(row) {
  if (!row) return row;
  const out = {};
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
}

function appToRow(obj, table) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) continue;
    let v = obj[k];
    if (UUID_FIELDS.has(k) && v != null && !UUID_RE.test(String(v))) v = null; // bad FK → null
    out[toSnake(k)] = v;
  }
  if (AUTO_ID_TABLES.has(table)) delete out.id; // let Postgres assign it
  return out;
}

// ─── Bulk load everything the app needs (called once after login) ───────────
// A pending invite (admin-added, not yet signed up) rendered as a user row.
export function pendingToUser(row) {
  const r = rowToApp(row);
  return { ...r, id: 'P_' + r.email, status: 'pending', pending: true,
    avatar: (r.name || r.email).replace(/\s/g, '').slice(0, 2).toUpperCase() };
}

export async function loadAll() {
  const [stock, dist, reorder, alloc, audit, notif, profiles, pending, depts] = await Promise.all([
    supabase.from('stock_items').select('*').order('id'),
    supabase.from('distributions').select('*').order('created_at', { ascending: false }),
    supabase.from('reorder_requests').select('*').order('request_date', { ascending: false }),
    supabase.from('employee_allocations').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*').order('date', { ascending: false }).limit(500),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('profiles').select('*').order('name'),
    supabase.from('pending_users').select('*').order('created_at', { ascending: false }),
    supabase.from('departments').select('*').order('name'),
  ]);
  const err = [stock, dist, reorder, alloc, audit, notif, profiles, pending, depts].find((r) => r.error);
  if (err) console.error('[api.loadAll]', err.error);
  return {
    stockItems: (stock.data || []).map(rowToApp),
    distributions: (dist.data || []).map(rowToApp),
    reorderRequests: (reorder.data || []).map(rowToApp),
    employeeAllocations: (alloc.data || []).map(rowToApp),
    auditLogs: (audit.data || []).map(rowToApp),
    notifications: (notif.data || []).map(rowToApp),
    users: [...(profiles.data || []).map(rowToApp), ...(pending.data || []).map(pendingToUser)],
    departments: (depts.data || []).map(rowToApp),
  };
}

// ─── Generic CRUD ───────────────────────────────────────────────────────────
export async function insertRow(table, obj) {
  const { data, error } = await supabase.from(table).insert(appToRow(obj, table)).select().single();
  if (error) { console.error(`[api.insert ${table}]`, error); return null; }
  return rowToApp(data);
}

export async function insertRows(table, objs) {
  const { data, error } = await supabase.from(table).insert(objs.map((o) => appToRow(o, table))).select();
  if (error) { console.error(`[api.insertMany ${table}]`, error); return []; }
  return (data || []).map(rowToApp);
}

// Insert-or-update by primary key — used by bulk upload so re-uploading an
// existing stock code updates its quantity instead of failing on conflict.
export async function upsertRows(table, objs) {
  const { data, error } = await supabase
    .from(table)
    .upsert(objs.map((o) => appToRow(o, table)), { onConflict: 'id' })
    .select();
  if (error) { console.error(`[api.upsert ${table}]`, error); return []; }
  return (data || []).map(rowToApp);
}

export async function updateRow(table, id, patch, keyCol = 'id') {
  const row = appToRow(patch, table);
  delete row[keyCol];
  const { data, error } = await supabase.from(table).update(row).eq(keyCol, id).select().single();
  if (error) { console.error(`[api.update ${table}]`, error); return null; }
  return rowToApp(data);
}

export async function deleteRow(table, id, keyCol = 'id') {
  const { error } = await supabase.from(table).delete().eq(keyCol, id);
  if (error) console.error(`[api.delete ${table}]`, error);
}

// ─── Realtime: subscribe to every table, fire onChange(table, eventType, row) ─
export function subscribeAll(onChange) {
  const tables = [
    'stock_items', 'distributions', 'reorder_requests',
    'employee_allocations', 'notifications', 'profiles', 'pending_users', 'departments',
  ];
  const channel = supabase.channel('app-db-changes');
  for (const table of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
      onChange(table, payload.eventType, rowToApp(row));
    });
  }
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}
