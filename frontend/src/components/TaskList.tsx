import { useState, FormEvent } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TASKS, CREATE_TASK, UPDATE_TASK, GET_TASK_COMMENTS, CREATE_TASK_COMMENT } from '../queries';

interface TaskListProps {
  organizationSlug: string;
  projectId: string;
}

export default function TaskList({ organizationSlug, projectId }: TaskListProps) {
  const { loading, error, data } = useQuery(GET_TASKS, {
    variables: { organizationSlug, projectId },
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newTaskData, setNewTaskData] = useState({ 
    title: '', 
    description: '', 
    status: 'TODO',
    assigneeEmail: '',
    dueDate: '' 
  });
  const [editTaskData, setEditTaskData] = useState({ 
    title: '', 
    description: '', 
    status: 'TODO',
    assigneeEmail: '',
    dueDate: '' 
  });
  const [commentData, setCommentData] = useState({ content: '', authorEmail: '' });

  const [createTask, { loading: creating }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { organizationSlug, projectId } }],
    onCompleted: () => {
      setIsCreating(false);
      setNewTaskData({ title: '', description: '', status: 'TODO', assigneeEmail: '', dueDate: '' });
    }
  });

  const [updateTask, { loading: updating }] = useMutation(UPDATE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { organizationSlug, projectId } }],
    onCompleted: () => {
      setEditingId(null);
    }
  });

  const [createComment] = useMutation(CREATE_TASK_COMMENT, {
    refetchQueries: [{ query: GET_TASK_COMMENTS, variables: { taskId: expandedTaskId, organizationSlug } }],
  });

  const { data: commentsData } = useQuery(GET_TASK_COMMENTS, {
    variables: { taskId: expandedTaskId, organizationSlug },
    skip: !expandedTaskId,
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createTask({
      variables: {
        projectId,
        organizationSlug,
        ...newTaskData,
        dueDate: newTaskData.dueDate ? new Date(newTaskData.dueDate).toISOString() : null
      }
    });
  };

  const handleEdit = (task: any) => {
    setEditingId(task.id);
    setEditTaskData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      assigneeEmail: task.assigneeEmail || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''
    });
  };

  const handleUpdate = (e: FormEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    updateTask({
      variables: {
        id: taskId,
        organizationSlug,
        ...editTaskData,
        dueDate: editTaskData.dueDate ? new Date(editTaskData.dueDate).toISOString() : null
      }
    });
  };

  const handleAddComment = (e: FormEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (commentData.content && commentData.authorEmail) {
      createComment({
        variables: {
          taskId,
          organizationSlug,
          content: commentData.content,
          authorEmail: commentData.authorEmail
        },
        refetchQueries: [{ query: GET_TASK_COMMENTS, variables: { taskId, organizationSlug } }],
      });
      setCommentData({ content: '', authorEmail: '' });
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(taskId);
    }
  };

  if (loading) return <p className="text-gray-500">Loading tasks...</p>;
  if (error) return <p className="text-red-500">Error loading tasks: {error.message}</p>;

  return (
    <div className="bg-white shadow rounded-lg p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Tasks</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
        >
          {isCreating ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mb-6 p-4 border rounded bg-gray-50">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Task Title"
              className="w-full border rounded p-2 text-sm"
              value={newTaskData.title}
              onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
              required
            />
            <textarea
              placeholder="Description"
              className="w-full border rounded p-2 text-sm"
              value={newTaskData.description}
              onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
            />
            <select
              className="w-full border rounded p-2 text-sm"
              value={newTaskData.status}
              onChange={e => setNewTaskData({...newTaskData, status: e.target.value})}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
            <input
              type="email"
              placeholder="Assignee Email"
              className="w-full border rounded p-2 text-sm"
              value={newTaskData.assigneeEmail}
              onChange={e => setNewTaskData({...newTaskData, assigneeEmail: e.target.value})}
            />
            <input
              type="datetime-local"
              className="w-full border rounded p-2 text-sm"
              value={newTaskData.dueDate}
              onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 bg-gray-200 text-gray-700 py-2 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {data.tasks.length === 0 ? (
          <p className="text-gray-500 text-sm">No tasks found for this project.</p>
        ) : (
          data.tasks.map((task: any) => (
            <div key={task.id} className="border rounded p-3 hover:bg-gray-50 transition-colors">
              {editingId === task.id ? (
                <form onSubmit={(e) => handleUpdate(e, task.id)} className="space-y-2">
                  <input
                    type="text"
                    className="w-full border rounded p-2 text-sm"
                    value={editTaskData.title}
                    onChange={e => setEditTaskData({...editTaskData, title: e.target.value})}
                    onClick={(e) => e.stopPropagation()}
                    required
                  />
                  <textarea
                    className="w-full border rounded p-2 text-sm"
                    value={editTaskData.description}
                    onChange={e => setEditTaskData({...editTaskData, description: e.target.value})}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <select
                    className="w-full border rounded p-2 text-sm"
                    value={editTaskData.status}
                    onChange={e => setEditTaskData({...editTaskData, status: e.target.value})}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  <input
                    type="email"
                    placeholder="Assignee Email"
                    className="w-full border rounded p-2 text-sm"
                    value={editTaskData.assigneeEmail}
                    onChange={e => setEditTaskData({...editTaskData, assigneeEmail: e.target.value})}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <input
                    type="datetime-local"
                    className="w-full border rounded p-2 text-sm"
                    value={editTaskData.dueDate}
                    onChange={e => setEditTaskData({...editTaskData, dueDate: e.target.value})}
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
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(task);
                        }}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 font-medium"
                      >
                        Edit
                      </button>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === 'TODO' ? 'bg-gray-100 text-gray-800' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    {task.assigneeEmail && (
                      <span className="flex items-center gap-1">
                        👤 {task.assigneeEmail}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 border-t pt-3">
                    <button
                      onClick={() => toggleTaskExpansion(task.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 mb-2"
                    >
                      {expandedTaskId === task.id ? 'Hide' : 'Show'} Comments ({commentsData?.taskComments?.length || 0})
                    </button>

                    {expandedTaskId === task.id && (
                      <div className="mt-2 space-y-3">
                        {commentsData?.taskComments?.map((comment: any) => (
                          <div key={comment.id} className="bg-gray-50 rounded p-2 text-sm">
                            <div className="font-medium text-gray-700">{comment.authorEmail}</div>
                            <div className="text-gray-600 mt-1">{comment.content}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(comment.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}

                        <form onSubmit={(e) => handleAddComment(e, task.id)} className="mt-2">
                          <input
                            type="email"
                            placeholder="Your email"
                            className="w-full border rounded p-2 text-xs mb-2"
                            value={commentData.authorEmail}
                            onChange={e => setCommentData({ ...commentData, authorEmail: e.target.value })}
                            required
                          />
                          <textarea
                            placeholder="Add a comment..."
                            className="w-full border rounded p-2 text-xs mb-2"
                            value={commentData.content}
                            onChange={e => setCommentData({ ...commentData, content: e.target.value })}
                            required
                          />
                          <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-1 rounded text-xs hover:bg-indigo-700"
                          >
                            Add Comment
                          </button>
                        </form>
                      </div>
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
