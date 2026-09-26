import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Task, SupabaseConfig } from '../types.ts';

const STORAGE_KEY_URL = 'crm_supabase_url';
const STORAGE_KEY_KEY = 'crm_supabase_anon_key';
const STORAGE_KEY_LOCAL_TASKS = 'crm_local_tasks_backup';

export const SUPABASE_SCHEMA_SQL = `-- ========================================================
-- 1. CRIAÇÃO DA TABELA DE TAREFAS DO CRM KANBAN
-- ========================================================
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  status text not null default 'Não iniciado', -- 'Não iniciado', 'Em Andamento', 'Finalizado'
  priority text default 'media',              -- 'baixa', 'media', 'alta', 'urgente'
  client_name text default '',
  client_email text default '',
  client_phone text default '',
  deal_value numeric default 0,
  due_date date,
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para melhor performance nas consultas do Kanban
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_created_at on public.tasks(created_at desc);

-- ========================================================
-- 2. TRIGGER PARA ATUALIZAR O CAMPO updated_at AUTOMATICAMENTE
-- ========================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- ========================================================
-- 3. HABILITAÇÃO DE SEGURANÇA POR NÍVEL DE LINHA (RLS)
-- ========================================================
alter table public.tasks enable row level security;

-- Limpeza de políticas existentes anteriores
drop policy if exists "Permitir leitura de tarefas" on public.tasks;
drop policy if exists "Permitir insercao de tarefas" on public.tasks;
drop policy if exists "Permitir atualizacao de tarefas" on public.tasks;
drop policy if exists "Permitir exclusao de tarefas" on public.tasks;
drop policy if exists "Permitir tudo para chave publica anon" on public.tasks;

-- POLÍTICA 1: Leitura de tarefas (SELECT)
create policy "Permitir leitura de tarefas"
  on public.tasks
  for select
  using (true);

-- POLÍTICA 2: Criação de tarefas (INSERT)
create policy "Permitir insercao de tarefas"
  on public.tasks
  for insert
  with check (true);

-- POLÍTICA 3: Edição e mudança de status (UPDATE)
create policy "Permitir atualizacao de tarefas"
  on public.tasks
  for update
  using (true)
  with check (true);

-- POLÍTICA 4: Exclusão de tarefas (DELETE)
create policy "Permitir exclusao de tarefas"
  on public.tasks
  for delete
  using (true);

-- ========================================================
-- 4. POLÍTICAS DE ARMAZENAMENTO (SUPABASE STORAGE BUCKET)
--    Cria o bucket para arquivos, propostas e anexos de tarefas
-- ========================================================
insert into storage.buckets (id, name, public)
values ('crm-arquivos', 'crm-arquivos', true)
on conflict (id) do update set public = true;

-- Políticas de RLS no Storage (storage.objects)
drop policy if exists "Permitir leitura publica de anexos" on storage.objects;
drop policy if exists "Permitir upload de anexos" on storage.objects;
drop policy if exists "Permitir atualizacao de anexos" on storage.objects;
drop policy if exists "Permitir exclusao de anexos" on storage.objects;

-- POLÍTICA 1: Leitura/Download de arquivos do bucket
create policy "Permitir leitura publica de anexos"
  on storage.objects
  for select
  using (bucket_id = 'crm-arquivos');

-- POLÍTICA 2: Upload de arquivos no bucket
create policy "Permitir upload de anexos"
  on storage.objects
  for insert
  with check (bucket_id = 'crm-arquivos');

-- POLÍTICA 3: Atualização de arquivos no bucket
create policy "Permitir atualizacao de anexos"
  on storage.objects
  for update
  using (bucket_id = 'crm-arquivos');

-- POLÍTICA 4: Exclusão de arquivos no bucket
create policy "Permitir exclusao de anexos"
  on storage.objects
  for delete
  using (bucket_id = 'crm-arquivos');

-- ========================================================
-- 5. HABILITAÇÃO DO SUPABASE REALTIME
-- ========================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
`;

let clientInstance: SupabaseClient | null = null;

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  return {
    url: (storedUrl || envUrl).trim(),
    anonKey: (storedKey || envKey).trim(),
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  }
  // Reset client so it re-initializes with the new credentials
  clientInstance = null;
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  clientInstance = null;
}

export function isConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('http'));
}

export function getSupabase(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !config.url.startsWith('http')) {
    return null;
  }

  try {
    clientInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return clientInstance;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string; tableMissing?: boolean }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      message: 'URL ou Chave Pública Anon não preenchidas corretamente.',
    };
  }

  try {
    const { data, error } = await supabase.from('tasks').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist') || error.message?.includes('relation "public.tasks" does not exist')) {
        return {
          success: false,
          tableMissing: true,
          message: 'Conectado ao Supabase! Porém a tabela "tasks" ainda não existe. Execute o script SQL no editor do Supabase.',
        };
      }
      return {
        success: false,
        message: `Erro do Supabase: ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida com sucesso! Tabela "tasks" pronta.',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Falha de rede ao conectar: ${errorMsg}`,
    };
  }
}

// Local storage backup functions
export function getLocalTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_TASKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.warn('Erro ao salvar tarefas no armazenamento local:', err);
  }
}

// CRUD Operations that interact with Supabase (with automatic local fallback)
export async function apiFetchTasks(): Promise<{ tasks: Task[]; source: 'supabase' | 'local'; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { tasks: getLocalTasks(), source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Falha ao buscar do Supabase, usando armazenamento local:', error.message);
      return {
        tasks: getLocalTasks(),
        source: 'local',
        error: error.message,
      };
    }

    const tasks: Task[] = (data || []).map((row) => ({
      id: String(row.id),
      title: row.title || '',
      description: row.description || '',
      status: row.status,
      priority: row.priority || 'media',
      client_name: row.client_name || '',
      client_email: row.client_email || '',
      client_phone: row.client_phone || '',
      deal_value: row.deal_value ? Number(row.deal_value) : 0,
      due_date: row.due_date || undefined,
      tags: Array.isArray(row.tags) ? row.tags : [],
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    }));

    // Cache to local storage
    saveLocalTasks(tasks);

    return { tasks, source: 'supabase' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { tasks: getLocalTasks(), source: 'local', error: msg };
  }
}

export async function apiCreateTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`;

  const newTask: Task = {
    ...taskData,
    id: tempId,
    created_at: now,
    updated_at: now,
  };

  if (!supabase) {
    const current = getLocalTasks();
    const updated = [newTask, ...current];
    saveLocalTasks(updated);
    return newTask;
  }

  try {
    const payload = {
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status,
      priority: taskData.priority,
      client_name: taskData.client_name || '',
      client_email: taskData.client_email || '',
      client_phone: taskData.client_phone || '',
      deal_value: taskData.deal_value || 0,
      due_date: taskData.due_date || null,
      tags: taskData.tags || [],
    };

    const { data, error } = await supabase.from('tasks').insert([payload]).select().single();

    if (error) {
      console.warn('Erro ao salvar no Supabase, salvando localmente:', error.message);
      const current = getLocalTasks();
      const updated = [newTask, ...current];
      saveLocalTasks(updated);
      return newTask;
    }

    const created: Task = {
      id: String(data.id),
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      client_name: data.client_name || '',
      client_email: data.client_email || '',
      client_phone: data.client_phone || '',
      deal_value: data.deal_value ? Number(data.deal_value) : 0,
      due_date: data.due_date || undefined,
      tags: data.tags || [],
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    };

    const current = getLocalTasks();
    saveLocalTasks([created, ...current.filter((t) => t.id !== created.id)]);
    return created;
  } catch (err) {
    console.error('Erro de requisição Supabase:', err);
    const current = getLocalTasks();
    const updated = [newTask, ...current];
    saveLocalTasks(updated);
    return newTask;
  }
}

export async function apiUpdateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Local update first (optimistic)
  const current = getLocalTasks();
  let updatedTask: Task | null = null;
  const updatedTasks = current.map((task) => {
    if (task.id === id) {
      updatedTask = { ...task, ...updates, updated_at: now };
      return updatedTask;
    }
    return task;
  });
  saveLocalTasks(updatedTasks);

  if (!supabase) {
    return updatedTask;
  }

  try {
    const payload: Record<string, unknown> = {
      updated_at: now,
    };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.client_name !== undefined) payload.client_name = updates.client_name;
    if (updates.client_email !== undefined) payload.client_email = updates.client_email;
    if (updates.client_phone !== undefined) payload.client_phone = updates.client_phone;
    if (updates.deal_value !== undefined) payload.deal_value = updates.deal_value;
    if (updates.due_date !== undefined) payload.due_date = updates.due_date || null;
    if (updates.tags !== undefined) payload.tags = updates.tags;

    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Falha no update Supabase:', error.message);
      return updatedTask;
    }

    return {
      id: String(data.id),
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      client_name: data.client_name || '',
      client_email: data.client_email || '',
      client_phone: data.client_phone || '',
      deal_value: data.deal_value ? Number(data.deal_value) : 0,
      due_date: data.due_date || undefined,
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error('Erro de update Supabase:', err);
    return updatedTask;
  }
}

export async function apiDeleteTask(id: string): Promise<boolean> {
  const current = getLocalTasks();
  saveLocalTasks(current.filter((t) => t.id !== id));

  const supabase = getSupabase();
  if (!supabase) return true;

  try {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.warn('Erro ao deletar no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro ao deletar no Supabase:', err);
    return false;
  }
}

export async function syncLocalTasksToSupabase(): Promise<{ count: number; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { count: 0, error: 'Supabase não está configurado' };
  }

  const localTasks = getLocalTasks();
  if (localTasks.length === 0) {
    return { count: 0 };
  }

  try {
    const payloads = localTasks.map((t) => ({
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      client_name: t.client_name || '',
      client_email: t.client_email || '',
      client_phone: t.client_phone || '',
      deal_value: t.deal_value || 0,
      due_date: t.due_date || null,
      tags: t.tags || [],
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    const { data, error } = await supabase.from('tasks').insert(payloads).select();
    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data?.length || localTasks.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { count: 0, error: msg };
  }
}
