export type TaskStatus = 'Não iniciado' | 'Em Andamento' | 'Finalizado';

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  deal_value?: number;
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface ColumnDefinition {
  id: TaskStatus;
  title: string;
  description: string;
  color: {
    bg: string;
    border: string;
    badge: string;
    header: string;
    accent: string;
  };
}
