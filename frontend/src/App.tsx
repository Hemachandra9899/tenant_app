import { useState } from 'react';
import OrganizationSelector from './components/OrganizationSelector';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';

function App() {
  const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (!organizationSlug) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <OrganizationSelector onSelect={setOrganizationSlug} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Tenant App</h1>
              <span className="ml-4 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-600">
                Org: {organizationSlug}
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  setOrganizationSlug(null);
                  setSelectedProjectId(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Switch Organization
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6 h-[calc(100vh-100px)]">
          <div className="w-1/3 overflow-y-auto">
            <ProjectList 
              organizationSlug={organizationSlug}
              onSelectProject={setSelectedProjectId}
              selectedProjectId={selectedProjectId}
            />
          </div>
          <div className="w-2/3 overflow-y-auto">
            {selectedProjectId ? (
              <TaskList 
                organizationSlug={organizationSlug}
                projectId={selectedProjectId}
              />
            ) : (
              <div className="bg-white shadow rounded-lg p-6 h-full flex items-center justify-center text-gray-500">
                Select a project to view tasks
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
