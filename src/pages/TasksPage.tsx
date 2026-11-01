import React, { useState } from 'react';
import { CheckSquare, Plus, Clock, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { dataStore } from '../services/mockData';
import { TaskReminder, UserRole } from '../types';
import { formatDateIST } from '../utils/formatters';

interface TasksPageProps {
  userRole: UserRole;
}

export const TasksPage: React.FC<TasksPageProps> = ({ userRole }) => {
  const [tasks, setTasks] = useState<TaskReminder[]>(() => dataStore.getTasks());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'high' as TaskReminder['priority'],
    dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
    relatedTo: '',
    assignedTo: 'Neha Singhal',
    reminderType: 'Renewal Followup' as TaskReminder['reminderType'],
  });

  const refreshData = () => {
    setTasks(dataStore.getTasks());
  };

  const handleToggleStatus = (id: string) => {
    dataStore.toggleTaskStatus(id);
    refreshData();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    dataStore.addTask({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      dueDate: formData.dueDate,
      relatedTo: formData.relatedTo,
      assignedTo: formData.assignedTo,
      status: 'pending',
      reminderType: formData.reminderType,
    });

    setIsAddModalOpen(false);
    refreshData();
    setFormData({
      title: '',
      description: '',
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      relatedTo: '',
      assignedTo: 'Neha Singhal',
      reminderType: 'Renewal Followup',
    });
  };

  const columns: Column<TaskReminder>[] = [
    {
      key: 'status',
      header: 'Done',
      width: '60px',
      align: 'center',
      render: (task) => (
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={() => handleToggleStatus(task.id)}
          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer h-4 w-4"
        />
      ),
    },
    {
      key: 'title',
      header: 'Action / Task & Context',
      sortable: true,
      render: (task) => (
        <div>
          <span className={`font-semibold block ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {task.title}
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
        </div>
      ),
    },
    {
      key: 'reminderType',
      header: 'Category',
      sortable: true,
      render: (task) => (
        <span className="font-medium text-slate-800">{task.reminderType}</span>
      ),
    },
    {
      key: 'relatedTo',
      header: 'Related Account / Contract',
      render: (task) => <span className="text-slate-700">{task.relatedTo}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'center',
      width: '100px',
      render: (task) => {
        const color =
          task.priority === 'high'
            ? 'text-rose-700 font-bold'
            : task.priority === 'medium'
            ? 'text-amber-700 font-semibold'
            : 'text-slate-500';
        return <span className={`text-xs uppercase ${color}`}>{task.priority}</span>;
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (task) => (
        <span className="font-mono text-slate-700 text-xs">{formatDateIST(task.dueDate)}</span>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assignee',
      render: (task) => <span className="text-slate-700 text-xs">{task.assignedTo}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Operations, Follow-ups & Renewal Reminders</h2>
          <p className="text-xs text-slate-500">
            Action items for 30-day policy renewals, document collection, FD maturities, and payment approvals
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={tasks}
        searchPlaceholder="Search tasks by title, account, assignee..."
        searchKeys={['title', 'description', 'relatedTo', 'assignedTo', 'reminderType']}
        statusFilterKey="status"
        statusFilterOptions={['pending', 'in_progress', 'completed']}
        exportFilename="Investxindia_Tasks_Followups"
        emptyTitle="No tasks pending"
        emptyDescription="All operational tasks and client renewal reminders are cleared."
      />

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Follow-up Task"
        subtitle="Assign operational action item to sales or CRM team"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Call client for Niva Bupa policy renewal"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide specific details or pending documents..."
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={formData.reminderType}
                onChange={(e) => setFormData({ ...formData, reminderType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              >
                <option value="Renewal Followup">Renewal Follow-up</option>
                <option value="Document Collection">Document Collection</option>
                <option value="Maturity Intimation">FD / Bond Maturity Intimation</option>
                <option value="Payout Query">Partner Payout Query</option>
                <option value="General">General Operational</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned To</label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Related Account / Entity</label>
            <input
              type="text"
              value={formData.relatedTo}
              onChange={(e) => setFormData({ ...formData, relatedTo: e.target.value })}
              placeholder="e.g. Manish Chawla (IX-CL-1004)"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
