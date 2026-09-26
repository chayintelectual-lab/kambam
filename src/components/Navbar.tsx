import React from 'react';
import {
  Trello,
  Plus,
  Search,
  Database,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { Task } from '../types.ts';

interface NavbarProps {
  tasks: Task[];
  isSupabaseConnected: boolean;
  onOpenSupabaseModal: () => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPriority: string;
  setSelectedPriority: (priority: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tasks,
  isSupabaseConnected,
  onOpenSupabaseModal,
  onOpenCreateModal,
  onRefresh,
  isRefreshing,
  searchQuery,
  setSearchQuery,
  selectedPriority,
  setSelectedPriority,
}) => {
  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'Em Andamento').length;
  const completedCount = tasks.filter((t) => t.status === 'Finalizado').length;
  const totalPipelineValue = tasks.reduce((acc, t) => acc + (t.deal_value || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Top bar: Brand & Main Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Trello className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  CRM Kanban
                </h1>
                {/* Supabase status badge */}
                <button
                  type="button"
                  onClick={onOpenSupabaseModal}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                    isSupabaseConnected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                  }`}
                  title="Configurar conexão com o Supabase"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <Database className="w-3 h-3" />
                  <span>{isSupabaseConnected ? 'Supabase Conectado' : 'Configurar Supabase'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie seus clientes, negociações e tarefas em tempo real
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Atualizar tarefas"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Supabase</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Pipeline Summary & Filter Row */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Metrics summary */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">Total:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{totalTasks}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-slate-500 dark:text-slate-400">Em Andamento:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{inProgressCount}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400">Finalizadas:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{completedCount}</span>
            </div>

            {totalPipelineValue > 0 && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 pl-2 border-l border-slate-200 dark:border-slate-700">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-500 dark:text-slate-400">Pipeline Total:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalPipelineValue)}
                </span>
              </div>
            )}
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tarefa, cliente, tag..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Priority filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="todas">Todas Prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
