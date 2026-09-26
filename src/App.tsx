import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Database,
  CheckCircle2,
  AlertCircle,
  Trello,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { Task, TaskStatus } from './types.ts';
import {
  apiFetchTasks,
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
  isConfigured,
  testConnection,
  getSupabase,
} from './lib/supabase.ts';
import { Navbar } from './components/Navbar.tsx';
import { KanbanBoard } from './components/KanbanBoard.tsx';
import { TaskModal } from './components/TaskModal.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('todas');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<TaskStatus>('Não iniciado');

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Check Supabase connectivity
  const checkSupabaseStatus = useCallback(async () => {
    if (!isConfigured()) {
      setIsSupabaseConnected(false);
      return;
    }
    const result = await testConnection();
    setIsSupabaseConnected(result.success);
  }, []);

  // Fetch tasks
  const loadTasks = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await apiFetchTasks();
      setTasks(res.tasks);
      if (res.source === 'supabase') {
        setIsSupabaseConnected(true);
      }
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTasks();
    checkSupabaseStatus();
  }, [loadTasks, checkSupabaseStatus]);

  // Set up Supabase Realtime channel subscription when configured
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const channel = supabase
        .channel('tasks-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          () => {
            loadTasks(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription não pôde ser iniciada:', err);
    }
  }, [isSupabaseConnected, loadTasks]);

  // Task Handlers
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    const updated = await apiUpdateTask(taskId, { status: newStatus });
    if (updated) {
      showToast(`Status movido para "${newStatus}"`, 'success');
    }
  };

  const handleSaveTask = async (
    taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>
  ) => {
    if (taskToEdit) {
      // Editing existing task
      const updated = await apiUpdateTask(taskToEdit.id, taskData);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === taskToEdit.id ? updated : t)));
        showToast('Tarefa atualizada com sucesso!', 'success');
      }
      setTaskToEdit(null);
    } else {
      // Creating new task manually (no mock data)
      const created = await apiCreateTask(taskData);
      setTasks((prev) => [created, ...prev]);
      showToast('Nova tarefa criada com sucesso!', 'success');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await apiDeleteTask(taskId);
    showToast('Tarefa excluída', 'info');
  };

  const handleOpenCreateModal = (status: TaskStatus = 'Não iniciado') => {
    setTaskToEdit(null);
    setDefaultStatusForNew(status);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700 shadow-rose-500/20'
                : 'bg-slate-800 text-white border-slate-700 shadow-slate-900/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Navigation & Header */}
      <Navbar
        tasks={tasks}
        isSupabaseConnected={isSupabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenCreateModal={() => handleOpenCreateModal('Não iniciado')}
        onRefresh={() => loadTasks(true)}
        isRefreshing={isRefreshing}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedPriority={selectedPriority}
        setSelectedPriority={setSelectedPriority}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Supabase Notice Banner if not configured yet */}
        {!isSupabaseConnected && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Supabase pronto para ser conectado
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  Suas tarefas estão sendo salvas localmente com segurança. Conecte sua URL e Chave Anon do Supabase para persistência na nuvem e sincronização em tempo real.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Conectar Supabase</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Carregando tarefas do CRM...
            </p>
          </div>
        ) : tasks.length === 0 ? (
          /* Empty CRM State (Strictly no mock data - ready for manual creation) */
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
              <Trello className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Seu CRM Kanban está pronto
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-md">
              Nenhuma tarefa modelo foi criada. Você pode começar adicionando suas próprias tarefas, clientes e oportunidades manualmente nos status <strong>Não iniciado</strong>, <strong>Em Andamento</strong> e <strong>Finalizado</strong>.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenCreateModal('Não iniciado')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeira Tarefa</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Configurar Supabase</span>
              </button>
            </div>

            {/* Quick Kanban Preview Columns */}
            <div className="mt-12 w-full">
              <KanbanBoard
                tasks={[]}
                onUpdateStatus={handleUpdateStatus}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onOpenCreateModal={handleOpenCreateModal}
                searchQuery=""
                selectedPriority="todas"
              />
            </div>
          </div>
        ) : (
          /* Kanban Board with created tasks */
          <KanbanBoard
            tasks={tasks}
            onUpdateStatus={handleUpdateStatus}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onOpenCreateModal={handleOpenCreateModal}
            searchQuery={searchQuery}
            selectedPriority={selectedPriority}
          />
        )}
      </main>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={handleSaveTask}
        taskToEdit={taskToEdit}
        defaultStatus={defaultStatusForNew}
      />

      {/* Supabase Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChanged={() => {
          checkSupabaseStatus();
          loadTasks(true);
        }}
      />
    </div>
  );
}
