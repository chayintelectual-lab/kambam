import React, { useState } from 'react';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  Plus,
  Inbox,
  Filter,
} from 'lucide-react';
import { Task, TaskStatus, ColumnDefinition } from '../types.ts';
import { TaskCard } from './TaskCard.tsx';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenCreateModal: (defaultStatus: TaskStatus) => void;
  searchQuery: string;
  selectedPriority: string;
}

const COLUMNS: ColumnDefinition[] = [
  {
    id: 'Não iniciado',
    title: 'Não iniciado',
    description: 'Tarefas planejadas ou novos leads para iniciar',
    color: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      border: 'border-amber-200 dark:border-amber-900/60',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
      header: 'text-amber-900 dark:text-amber-200',
      accent: 'text-amber-600 dark:text-amber-400',
    },
  },
  {
    id: 'Em Andamento',
    title: 'Em Andamento',
    description: 'Tarefas sendo executadas ou negociações ativas',
    color: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/15',
      border: 'border-sky-200 dark:border-sky-900/60',
      badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300',
      header: 'text-sky-900 dark:text-sky-200',
      accent: 'text-sky-600 dark:text-sky-400',
    },
  },
  {
    id: 'Finalizado',
    title: 'Finalizado',
    description: 'Tarefas concluídas e negócios fechados',
    color: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      border: 'border-emerald-200 dark:border-emerald-900/60',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
      header: 'text-emerald-900 dark:text-emerald-200',
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onUpdateStatus,
  onEditTask,
  onDeleteTask,
  onOpenCreateModal,
  searchQuery,
  selectedPriority,
}) => {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search query matches title, description, client name, email, phone or tags
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchClient = task.client_name?.toLowerCase().includes(q);
      const matchEmail = task.client_email?.toLowerCase().includes(q);
      const matchPhone = task.client_phone?.toLowerCase().includes(q);
      const matchTags = task.tags?.some((t) => t.toLowerCase().includes(q));

      if (!matchTitle && !matchDesc && !matchClient && !matchEmail && !matchPhone && !matchTags) {
        return false;
      }
    }

    // Priority filter
    if (selectedPriority && selectedPriority !== 'todas') {
      if (task.priority !== selectedPriority) return false;
    }

    return true;
  });

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: TaskStatus) => {
    // Prevent flickering when dragging over child elements
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      if (dragOverColumn === columnId) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onUpdateStatus(taskId, targetStatus);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {COLUMNS.map((col) => {
        const columnTasks = filteredTasks.filter((t) => t.status === col.id);
        const columnValue = columnTasks.reduce((acc, t) => acc + (t.deal_value || 0), 0);
        const isDragOver = dragOverColumn === col.id;

        const getColumnIcon = () => {
          switch (col.id) {
            case 'Não iniciado':
              return <Clock className="w-4 h-4 text-amber-500" />;
            case 'Em Andamento':
              return <ArrowRight className="w-4 h-4 text-sky-500" />;
            case 'Finalizado':
              return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
          }
        };

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl border transition-all duration-200 ${
              isDragOver
                ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* Column Header */}
            <div className="p-4 border-b border-slate-200/70 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {getColumnIcon()}
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {col.title}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${col.color.badge}`}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenCreateModal(col.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                  title={`Adicionar tarefa em ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Total pipeline value in this column */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="text-[11px] truncate max-w-[180px]">
                  {col.description}
                </span>
                {columnValue > 0 && (
                  <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    {formatCurrency(columnValue)}
                  </span>
                )}
              </div>
            </div>

            {/* Task list container */}
            <div className="p-3 space-y-3 min-h-[380px] max-h-[calc(100vh-260px)] overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="h-44 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                  <Inbox className="w-7 h-7 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nenhuma tarefa aqui
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 max-w-[190px]">
                    Arraste uma tarefa até aqui ou crie uma nova.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenCreateModal(col.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-500" />
                    Criar tarefa
                  </button>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={onUpdateStatus}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))
              )}
            </div>

            {/* Quick add footer */}
            <div className="p-3 border-t border-slate-200/50 dark:border-slate-800/50">
              <button
                type="button"
                onClick={() => onOpenCreateModal(col.id)}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Tarefa</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
