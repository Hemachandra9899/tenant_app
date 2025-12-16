import { useState, FormEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_PROJECTS, CREATE_PROJECT, UPDATE_PROJECT } from '../queries';

interface ProjectListProps {
  organizationSlug: string;
  onSelectProject: (id: string) => void;
  selectedProjectId: string | null;
}

export default function ProjectList({ organizationSlug, onSelectProject, selectedProjectId }: ProjectListProps) {
  const { loading, error, data } = useQuery(GET_PROJECTS, {
    variables: { organizationSlug },
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectData, setNewProjectData] = useState({ name: '', description: '', status: 'ACTIVE', dueDate: '' });
  const [editProjectData, setEditProjectData] = useState({ name: '', description: '', status: 'ACTIVE', dueDate: '' });

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS, variables: { organizationSlug } }],
    onCompleted: () => {
      setIsCreating(false);
      setNewProjectData({ name: '', description: '', status: 'ACTIVE', dueDate: '' });
    }
  });

  const [updateProject, { loading: updating }] = useMutation(UPDATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS, variables: { organizationSlug } }],
    onCompleted: () => {
      setEditingId(null);
    }
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createProject({
      variables: {
        organizationSlug,
        ...newProjectData,
        dueDate: newProjectData.dueDate || null
      }
    });
  };

  const handleEdit = (project: any) => {
    setEditingId(project.id);
    setEditProjectData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      dueDate: project.dueDate ? project.dueDate.split('T')[0] : ''
    });
  };

  const handleUpdate = (e: FormEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    updateProject({
      variables: {
        id: projectId,
        organizationSlug,
        ...editProjectData,
        dueDate: editProjectData.dueDate || null
      }
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setNewProjectData({ name: '', description: '', status: 'ACTIVE', dueDate: '' });
  };

  if (loading) return <p className="text-gray-500">Loading projects...</p>;
  if (error) return <p className="text-red-500">Error loading projects: {error.message}</p>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Projects</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
        >
          {isCreating ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mb-6 p-4 border rounded bg-gray-50">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Project Name"
              className="w-full border rounded p-2 text-sm"
              value={newProjectData.name}
              onChange={e => setNewProjectData({...newProjectData, name: e.target.value})}
              required
            />
            <textarea
              placeholder="Description"
              className="w-full border rounded p-2 text-sm"
              value={newProjectData.description}
              onChange={e => setNewProjectData({...newProjectData, description: e.target.value})}
            />
            <select
              className="w-full border rounded p-2 text-sm"
              value={newProjectData.status}
              onChange={e => setNewProjectData({...newProjectData, status: e.target.value})}
            >
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
            <input
              type="date"
              className="w-full border rounded p-2 text-sm"
              value={newProjectData.dueDate}
              onChange={e => setNewProjectData({...newProjectData, dueDate: e.target.value})}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 bg-gray-200 text-gray-700 py-2 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {data.projects.length === 0 ? (
          <p className="text-gray-500 text-sm">No projects found.</p>
        ) : (
          data.projects.map((project: any) => (
            <div
              key={project.id}
              className={`p-3 rounded border transition-colors ${
                selectedProjectId === project.id
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'hover:bg-gray-50 border-gray-100'
              }`}
            >
              {editingId === project.id ? (
                <form onSubmit={(e) => handleUpdate(e, project.id)} className="space-y-2">
                  <input
                    type="text"
                    className="w-full border rounded p-2 text-sm"
                    value={editProjectData.name}
                    onChange={e => setEditProjectData({...editProjectData, name: e.target.value})}
                    onClick={(e) => e.stopPropagation()}
                    required
                  />
                  <textarea
                    className="w-full border rounded p-2 text-sm"
                    value={editProjectData.description}
                    onChange={e => setEditProjectData({...editProjectData, description: e.target.value})}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editProjectData.status}
                    onChange={e => setEditProjectData({...editProjectData, status: e.target.value})}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                  <input
                    type="date"
                    className="w-full border rounded p-2 text-sm"
                    value={editProjectData.dueDate}
                    onChange={e => setEditProjectData({...editProjectData, dueDate: e.target.value})}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="flex-1 bg-indigo-600 text-white py-1 rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {updating ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                      className="px-3 bg-gray-200 text-gray-700 py-1 rounded text-xs hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={() => onSelectProject(project.id)}>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 truncate">{project.description}</p>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(project);
                        }}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 font-medium"
                      >
                        Edit
                      </button>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex gap-3">
                      <span>Tasks: {project.taskCount || 0}</span>
                      <span>Completed: {project.completedTasks || 0}</span>
                      {project.completionRate !== undefined && (
                        <span>Rate: {project.completionRate}%</span>
                      )}
                    </div>
                    {project.dueDate && (
                      <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
