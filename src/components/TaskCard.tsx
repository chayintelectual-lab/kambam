import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types.ts';

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string; border: string }> = {
  baixa: {
    label: 'Baixa',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  media: {
    label: 'Média',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
  },
  alta: {
    label: 'Alta',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  urgente: {
    label: 'Urgente',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdateStatus,
  onEdit,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || val === 0) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr || task.status === 'Finalizado') return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  const priorityStyle = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
  const overdue = isOverdue(task.due_date);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing ${
        task.status === 'Finalizado' ? 'opacity-90' : ''
      }`}
    >
      {/* Top row: Priority & Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
        >
          {priorityStyle.label}
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Mais opções"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-7 w-44 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-slate-200 dark:border-slate-750 py-1 z-20 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(task);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                  Editar Tarefa
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Mover Para:
                </div>

                {task.status !== 'Não iniciado' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onUpdateStatus(task.id, 'Não iniciado');
                    }}
                    className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Não iniciado
                  </button>
                )}

                {task.status !== 'Em Andamento' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onUpdateStatus(task.id, 'Em Andamento');
                    }}
                    className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-sky-500" />
                    Em Andamento
                  </button>
                )}

                {task.status !== 'Finalizado' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onUpdateStatus(task.id, 'Finalizado');
                    }}
                    className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Finalizado
                  </button>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsDeleting(true);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Task Title */}
      <h3
        onClick={() => onEdit(task)}
        className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors mb-1.5"
      >
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Client / Deal Information */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 mb-3">
        {task.client_name && (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{task.client_name}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          {task.client_email && (
            <a
              href={`mailto:${task.client_email}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[130px]"
              title={task.client_email}
            >
              <Mail className="w-3 h-3 text-slate-400" />
              <span className="truncate">{task.client_email}</span>
            </a>
          )}

          {task.client_phone && (
            <a
              href={`https://wa.me/${task.client_phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              title="Conversar no WhatsApp"
            >
              <Phone className="w-3 h-3 text-emerald-500" />
              <span>{task.client_phone}</span>
            </a>
          )}
        </div>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal"
            >
              <Tag className="w-2.5 h-2.5 text-slate-400" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom info: Deal Value, Due Date & Quick Status Shift */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          {formatCurrency(task.deal_value) && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
              <DollarSign className="w-3 h-3 -mr-0.5" />
              {formatCurrency(task.deal_value)}
            </span>
          )}

          {task.due_date && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${
                overdue
                  ? 'text-rose-600 dark:text-rose-400 font-medium'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              title={overdue ? 'Prazo vencido!' : 'Prazo de entrega'}
            >
              {overdue ? (
                <AlertTriangle className="w-3 h-3 text-rose-500" />
              ) : (
                <Calendar className="w-3 h-3 text-slate-400" />
              )}
              {formatDate(task.due_date)}
            </span>
          )}
        </div>

        {/* Quick Progression Button */}
        <div className="flex items-center gap-1">
          {task.status === 'Não iniciado' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'Em Andamento')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-medium text-[11px] transition-colors"
              title="Mover para Em Andamento"
            >
              <span>Iniciar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {task.status === 'Em Andamento' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateStatus(task.id, 'Não iniciado')}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                title="Voltar para Não iniciado"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(task.id, 'Finalizado')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] transition-colors"
                title="Mover para Finalizado"
              >
                <span>Concluir</span>
                <CheckCircle2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {task.status === 'Finalizado' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'Em Andamento')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px] transition-colors"
              title="Reabrir tarefa"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Reabrir</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {isDeleting && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-xl p-4 flex flex-col justify-center items-center text-center z-20 border border-rose-200 dark:border-rose-900">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1">
            Excluir esta tarefa?
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDeleting(false)}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="px-2.5 py-1 text-xs rounded-md bg-rose-600 text-white hover:bg-rose-700 font-medium transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
