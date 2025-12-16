import { gql } from '@apollo/client';

export const GET_ORGANIZATION = gql`
  query GetOrganization($slug: String!) {
    organization(slug: $slug) {
      id
      name
      slug
      contactEmail
    }
  }
`;

export const GET_PROJECTS = gql`
  query GetProjects($organizationSlug: String!) {
    projects(organizationSlug: $organizationSlug) {
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
`;

export const GET_TASKS = gql`
  query GetTasks($organizationSlug: String!, $projectId: ID) {
    tasks(organizationSlug: $organizationSlug, projectId: $projectId) {
      id
      title
      description
      status
      assigneeEmail
      dueDate
    }
  }
`;

export const GET_TASK_COMMENTS = gql`
  query GetTaskComments($taskId: ID!, $organizationSlug: String!) {
    taskComments(taskId: $taskId, organizationSlug: $organizationSlug) {
      id
      content
      authorEmail
      createdAt
    }
  }
`;

export const GET_PROJECT_STATISTICS = gql`
  query GetProjectStatistics($organizationSlug: String!, $projectId: ID) {
    projectStatistics(organizationSlug: $organizationSlug, projectId: $projectId) {
      totalProjects
      totalTasks
      completedTasks
      activeTasks
      completionRate
    }
  }
`;

export const CREATE_ORGANIZATION = gql`
  mutation CreateOrganization($name: String!, $slug: String!, $contactEmail: String!) {
    createOrganization(name: $name, slug: $slug, contactEmail: $contactEmail) {
      organization {
        id
        name
        slug
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($organizationSlug: String!, $name: String!, $description: String, $status: String, $dueDate: Date) {
    createProject(organizationSlug: $organizationSlug, name: $name, description: $description, status: $status, dueDate: $dueDate) {
      project {
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
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $organizationSlug: String!, $name: String, $description: String, $status: String, $dueDate: Date) {
    updateProject(id: $id, organizationSlug: $organizationSlug, name: $name, description: $description, status: $status, dueDate: $dueDate) {
      project {
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
  }
`;

export const CREATE_TASK = gql`
  mutation CreateTask($projectId: ID!, $organizationSlug: String!, $title: String!, $description: String, $status: String, $assigneeEmail: String, $dueDate: DateTime) {
    createTask(projectId: $projectId, organizationSlug: $organizationSlug, title: $title, description: $description, status: $status, assigneeEmail: $assigneeEmail, dueDate: $dueDate) {
      task {
        id
        title
        description
        status
        assigneeEmail
        dueDate
      }
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $organizationSlug: String!, $title: String, $description: String, $status: String, $assigneeEmail: String, $dueDate: DateTime) {
    updateTask(id: $id, organizationSlug: $organizationSlug, title: $title, description: $description, status: $status, assigneeEmail: $assigneeEmail, dueDate: $dueDate) {
      task {
        id
        title
        description
        status
        assigneeEmail
        dueDate
      }
    }
  }
`;

export const CREATE_TASK_COMMENT = gql`
  mutation CreateTaskComment($taskId: ID!, $organizationSlug: String!, $content: String!, $authorEmail: String!) {
    createTaskComment(taskId: $taskId, organizationSlug: $organizationSlug, content: $content, authorEmail: $authorEmail) {
      comment {
        id
        content
        authorEmail
        createdAt
      }
    }
  }
`;
