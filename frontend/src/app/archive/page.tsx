'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { ProjectsApi, TasksApi } from '@/lib/endpoints';
import type { Project, Task } from '@/lib/types';
import Pagination from '@/components/Pagination';

type Tab = 'tasks' | 'projects';

const PAGE_SIZE = 10;

function ArchiveContent() {
  const [tab, setTab] = useState<Tab>('tasks');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [tasksPage, setTasksPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [taskRes, projectRes] = await Promise.all([
        TasksApi.list({ status: 'Archived', limit: String(PAGE_SIZE), page: String(tasksPage) }),
        ProjectsApi.list({
          status: 'Archived',
          limit: String(PAGE_SIZE),
          page: String(projectsPage),
        }),
      ]);
      setTasks(taskRes.items);
      setTasksTotal(taskRes.total);
      setProjects(projectRes.items);
      setProjectsTotal(projectRes.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the archive.');
    } finally {
      setLoading(false);
    }
  }, [tasksPage, projectsPage]);

  useEffect(() => {
    load();
  }, [load]);

  const tasksTotalPages = Math.max(Math.ceil(tasksTotal / PAGE_SIZE), 1);
  const projectsTotalPages = Math.max(Math.ceil(projectsTotal / PAGE_SIZE), 1);

  async function unarchiveTask(id: string) {
    setBusyId(id);
    try {
      await TasksApi.unarchive(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not unarchive this task.');
    } finally {
      setBusyId(null);
    }
  }

  async function unarchiveProject(id: string) {
    setBusyId(id);
    try {
      await ProjectsApi.unarchive(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not unarchive this project.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Archive</h1>
      <p className="mt-1 text-sm text-slate-500">
        Archived tasks and projects. Unarchiving restores a task to its pre-archive status, and a
        project to Planned (or Active/Completed once its tasks are re-evaluated).
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setTab('tasks')}
          className={`btn ${tab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Tasks {loading ? '' : `(${tasksTotal})`}
        </button>
        <button
          onClick={() => setTab('projects')}
          className={`btn ${tab === 'projects' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Projects {loading ? '' : `(${projectsTotal})`}
        </button>
      </div>

      <div className="mt-4 card divide-y divide-slate-100">
        {error ? (
          <p className="p-6 text-center text-red-600">{error}</p>
        ) : loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : tab === 'tasks' ? (
          tasks.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No archived tasks.</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <Link href={`/tasks/${task.id}`} className="min-w-0 hover:underline">
                  <div className="truncate font-medium text-slate-800">{task.titleEn}</div>
                  <div className="text-xs text-slate-500">
                    {task.project?.name ? `${task.project.name} · ` : ''}
                    {task.deadlineDate ? `Due ${task.deadlineDate}` : 'No deadline'}
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge value={task.priority} />
                  <button
                    onClick={() => unarchiveTask(task.id)}
                    disabled={busyId === task.id}
                    className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
                  >
                    {busyId === task.id ? 'Unarchiving…' : 'Unarchive'}
                  </button>
                </div>
              </div>
            ))
          )
        ) : projects.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No archived projects.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">{project.name}</div>
                {project.description && (
                  <div className="truncate text-xs text-slate-500">{project.description}</div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => unarchiveProject(project.id)}
                  disabled={busyId === project.id}
                  className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
                >
                  {busyId === project.id ? 'Unarchiving…' : 'Unarchive'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && !error && tab === 'tasks' && (
        <Pagination
          page={tasksPage}
          totalPages={tasksTotalPages}
          total={tasksTotal}
          onPageChange={setTasksPage}
          itemLabel="tasks"
        />
      )}
      {!loading && !error && tab === 'projects' && (
        <Pagination
          page={projectsPage}
          totalPages={projectsTotalPages}
          total={projectsTotal}
          onPageChange={setProjectsPage}
          itemLabel="projects"
        />
      )}
    </div>
  );
}

export default function ArchivePage() {
  return (
    <ProtectedRoute adminOnly>
      <ArchiveContent />
    </ProtectedRoute>
  );
}
