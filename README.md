# Multi-Tenant Project Management System

A full-stack project management application built with Django (GraphQL) and React (TypeScript), featuring multi-tenant organization isolation, project management, task tracking, and comment systems.

## 🚀 Features

### Backend (Django + GraphQL)
- ✅ **Multi-tenant Architecture**: Organization-based data isolation
- ✅ **Data Models**: Organization, Project, Task, TaskComment
- ✅ **GraphQL API**: Complete CRUD operations with queries and mutations
- ✅ **Project Statistics**: Task counts, completion rates, and analytics
- ✅ **Real-time Updates**: WebSocket support for live notifications
- ✅ **Data Validation**: Proper error handling and validation

### Frontend (React + TypeScript)
- ✅ **Project Dashboard**: List view with status indicators and statistics
- ✅ **Task Management**: Board/list view with status updates
- ✅ **Comment System**: Add comments to tasks with author tracking
- ✅ **Edit Functionality**: Update projects and tasks inline
- ✅ **Responsive Design**: Modern UI with TailwindCSS
- ✅ **Apollo Client**: Optimistic updates and cache management
- ✅ **Loading States**: Proper error handling and loading indicators

## 📋 Prerequisites

- Python 3.8+ (Python 3.13 recommended)
- Node.js 16+ and npm/yarn
- PostgreSQL 12+ (or SQLite for development)
- Git

## 🛠️ Installation & Setup

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install django graphene-django django-cors-headers channels daphne psycopg2-binary
   ```

4. **Configure Database:**
   
   For PostgreSQL (recommended):
   - Create a database named `tenant_db`
   - Update `backend/config/settings.py` with your database credentials:
     ```python
     DATABASES = {
         'default': {
             'ENGINE': 'django.db.backends.postgresql',
             'NAME': 'tenant_db',
             'USER': 'postgres',
             'PASSWORD': 'your_password',
             'HOST': 'localhost',
             'PORT': '5432',
         }
     }
     ```

   For SQLite (development only):
   - Change `DATABASES` in `settings.py` to use SQLite:
     ```python
     DATABASES = {
         'default': {
             'ENGINE': 'django.db.backends.sqlite3',
             'NAME': BASE_DIR / 'db.sqlite3',
         }
     }
     ```

5. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create a superuser (optional, for admin access):**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start the Django server:**
   ```bash
   python manage.py runserver
   ```
   
   The GraphQL endpoint will be available at: `http://localhost:8000/graphql/`
   GraphiQL interface: `http://localhost:8000/graphql/` (interactive GraphQL explorer)

## 🚀 Running Both Servers

### Quick Start (Windows PowerShell)
```powershell
.\start-servers.ps1
```

### Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# OR
source venv/bin/activate     # macOS/Linux
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Server URLs
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **GraphQL API**: `http://localhost:8000/graphql/`
- **GraphiQL Interface**: `http://localhost:8000/graphql/`
- **Django Admin**: `http://localhost:8000/admin/`

### Frontend Setup

**Note for Windows:** If `npm` is not recognized, add Node.js to PATH first:
```powershell
$env:Path += ";C:\Program Files\nodejs"
```

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The frontend will be available at: `http://localhost:5173` (or the port shown in terminal)

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## 📚 API Documentation

### GraphQL Schema

#### Queries

**Get Organization**
```graphql
query {
  organization(slug: "acme-corp") {
    id
    name
    slug
    contactEmail
  }
}
```

**List Projects**
```graphql
query {
  projects(organizationSlug: "acme-corp") {
    id
    name
    description
    status
    dueDate
    taskCount
    completedTasks
    completionRate
  }
}
```

**Get Project Statistics**
```graphql
query {
  projectStatistics(organizationSlug: "acme-corp", projectId: "1") {
    totalProjects
    totalTasks
    completedTasks
    activeTasks
    completionRate
  }
}
```

**List Tasks**
```graphql
query {
  tasks(organizationSlug: "acme-corp", projectId: "1") {
    id
    title
    description
    status
    assigneeEmail
    dueDate
  }
}
```

**Get Task Comments**
```graphql
query {
  taskComments(taskId: "1", organizationSlug: "acme-corp") {
    id
    content
    authorEmail
    createdAt
  }
}
```

#### Mutations

**Create Organization**
```graphql
mutation {
  createOrganization(
    name: "Acme Corp"
    slug: "acme-corp"
    contactEmail: "contact@acme.com"
  ) {
    organization {
      id
      name
      slug
    }
  }
}
```

**Create Project**
```graphql
mutation {
  createProject(
    organizationSlug: "acme-corp"
    name: "New Project"
    description: "Project description"
    status: "ACTIVE"
    dueDate: "2024-12-31"
  ) {
    project {
      id
      name
      status
    }
  }
}
```

**Update Project**
```graphql
mutation {
  updateProject(
    id: "1"
    organizationSlug: "acme-corp"
    name: "Updated Project Name"
    status: "COMPLETED"
  ) {
    project {
      id
      name
      status
    }
  }
}
```

**Create Task**
```graphql
mutation {
  createTask(
    projectId: "1"
    organizationSlug: "acme-corp"
    title: "New Task"
    description: "Task description"
    status: "TODO"
    assigneeEmail: "user@example.com"
    dueDate: "2024-12-31T23:59:59Z"
  ) {
    task {
      id
      title
      status
    }
  }
}
```

**Update Task**
```graphql
mutation {
  updateTask(
    id: "1"
    organizationSlug: "acme-corp"
    status: "IN_PROGRESS"
  ) {
    task {
      id
      title
      status
    }
  }
}
```

**Add Comment to Task**
```graphql
mutation {
  createTaskComment(
    taskId: "1"
    organizationSlug: "acme-corp"
    content: "This is a comment"
    authorEmail: "commenter@example.com"
  ) {
    comment {
      id
      content
      authorEmail
      createdAt
    }
  }
}
```

### Data Models

**Organization**
- `id`: Primary key
- `name`: Organization name (max 100 chars)
- `slug`: Unique slug identifier
- `contact_email`: Contact email address
- `created_at`: Timestamp

**Project**
- `id`: Primary key
- `organization`: Foreign key to Organization
- `name`: Project name (max 200 chars)
- `description`: Project description (text)
- `status`: One of ACTIVE, COMPLETED, ON_HOLD
- `due_date`: Optional due date
- `created_at`: Timestamp

**Task**
- `id`: Primary key
- `project`: Foreign key to Project
- `title`: Task title (max 200 chars)
- `description`: Task description (text)
- `status`: One of TODO, IN_PROGRESS, DONE
- `assignee_email`: Assignee email address
- `due_date`: Optional due date/time
- `created_at`: Timestamp

**TaskComment**
- `id`: Primary key
- `task`: Foreign key to Task
- `content`: Comment content (text)
- `author_email`: Author email address
- `created_at`: Timestamp

## 🏗️ Architecture

### Multi-Tenancy Implementation

The application implements organization-based multi-tenancy:

1. **Data Isolation**: All queries filter by `organization_slug` to ensure data separation
2. **Context Validation**: Mutations verify organization context before operations
3. **Security**: Prevents cross-organization data access

### Frontend Architecture

- **Component Structure**: Modular React components with TypeScript
- **State Management**: Apollo Client for server state, React hooks for local state
- **Styling**: TailwindCSS for responsive, modern UI
- **Error Handling**: Comprehensive error boundaries and user feedback

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Project Structure

```
tenant/
├── backend/
│   ├── config/          # Django settings
│   ├── core/            # Main app
│   │   ├── models.py    # Data models
│   │   ├── schema.py    # GraphQL schema
│   │   └── admin.py     # Admin configuration
│   ├── manage.py
│   └── requirements.txt # Python dependencies
```
tenant/
├── backend/
│   ├── config/          # Django settings
│   ├── core/            # Main app
│   │   ├── models.py    # Data models
│   │   ├── schema.py    # GraphQL schema
│   │   └── admin.py     # Admin configuration
│   ├── manage.py
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── queries.ts   # GraphQL queries/mutations
│   │   ├── client.ts    # Apollo Client setup
│   │   └── App.tsx      # Main app component
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🎯 Usage Guide

1. **Start Backend**: Run `python manage.py runserver` in the `backend` directory
2. **Start Frontend**: Run `npm run dev` in the `frontend` directory
3. **Access Application**: Open `http://localhost:5173` in your browser
4. **Select/Create Organization**: Enter an organization slug or create a new one
5. **Create Projects**: Click "New Project" to create projects
6. **Manage Tasks**: Select a project to view and manage its tasks
7. **Add Comments**: Expand a task to view and add comments
8. **Edit Items**: Click "Edit" on any project or task to modify it

## 🔒 Security Considerations

- Multi-tenant data isolation enforced at GraphQL layer
- Input validation on all mutations
- CORS configured for development (should be restricted in production)
- SQL injection protection via Django ORM
- XSS protection via React's built-in escaping

## 🚧 Future Improvements

- [ ] User authentication and authorization
- [ ] Advanced filtering and search
- [ ] Real-time subscriptions with GraphQL subscriptions
- [ ] File attachments for tasks
- [ ] Email notifications
- [ ] Advanced analytics dashboard
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Comprehensive test coverage
- [ ] Performance optimizations (caching, pagination)

## 📝 Technical Decisions

### Why GraphQL?
- Flexible queries reduce over-fetching
- Single endpoint simplifies API management
- Strong typing with schema validation
- Excellent tooling (GraphiQL)

### Why Apollo Client?
- Automatic caching and cache updates
- Optimistic UI updates
- Error handling and retry logic
- TypeScript integration

### Why TailwindCSS?
- Utility-first approach for rapid development
- Consistent design system
- Responsive design made easy
- Small production bundle size

## 📄 License

This project is created for evaluation purposes.

## 👤 Author

Built as part of a technical screening assessment.

## 🤝 Contributing

This is an assessment project. For questions or clarifications, please refer to the task requirements document.
