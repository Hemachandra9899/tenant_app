import graphene
from graphene_django import DjangoObjectType
from .models import Organization, Project, Task, TaskComment

class OrganizationType(DjangoObjectType):
    class Meta:
        model = Organization
        fields = "__all__"

class ProjectType(DjangoObjectType):
    taskCount = graphene.Int()
    completedTasks = graphene.Int()
    completionRate = graphene.Float()

    class Meta:
        model = Project
        fields = "__all__"

    def resolve_taskCount(self, info):
        return self.tasks.count()

    def resolve_completedTasks(self, info):
        return self.tasks.filter(status='DONE').count()

    def resolve_completionRate(self, info):
        total = self.tasks.count()
        if total == 0:
            return 0.0
        completed = self.tasks.filter(status='DONE').count()
        return round((completed / total) * 100, 2)

class TaskType(DjangoObjectType):
    class Meta:
        model = Task
        fields = "__all__"

class TaskCommentType(DjangoObjectType):
    class Meta:
        model = TaskComment
        fields = "__all__"

class ProjectStatisticsType(graphene.ObjectType):
    totalProjects = graphene.Int()
    totalTasks = graphene.Int()
    completedTasks = graphene.Int()
    activeTasks = graphene.Int()
    completionRate = graphene.Float()

class Query(graphene.ObjectType):
    organization = graphene.Field(OrganizationType, slug=graphene.String(required=True))
    projects = graphene.List(ProjectType, organizationSlug=graphene.String(required=True))
    tasks = graphene.List(TaskType, organizationSlug=graphene.String(required=True), projectId=graphene.ID())
    taskComments = graphene.List(TaskCommentType, taskId=graphene.ID(required=True), organizationSlug=graphene.String(required=True))
    projectStatistics = graphene.Field(ProjectStatisticsType, organizationSlug=graphene.String(required=True), projectId=graphene.ID())

    def resolve_organization(self, info, slug):
        try:
            return Organization.objects.get(slug=slug)
        except Organization.DoesNotExist:
            raise Exception("Organization not found")

    def resolve_projects(self, info, organizationSlug):
        return Project.objects.filter(
            organization__slug=organizationSlug
        ).prefetch_related('tasks')

    def resolve_tasks(self, info, organizationSlug, projectId=None):
        queryset = Task.objects.filter(
            project__organization__slug=organizationSlug
        ).select_related('project').prefetch_related('comments')
        if projectId:
            queryset = queryset.filter(project_id=projectId)
        return queryset

    def resolve_taskComments(self, info, taskId, organizationSlug):
        try:
            task = Task.objects.get(pk=taskId, project__organization__slug=organizationSlug)
            return TaskComment.objects.filter(task=task).select_related('task')
        except Task.DoesNotExist:
            return []

    def resolve_projectStatistics(self, info, organizationSlug, projectId=None):
        try:
            organization = Organization.objects.get(slug=organizationSlug)
            projects = Project.objects.filter(organization=organization).prefetch_related('tasks')
            
            if projectId:
                projects = projects.filter(pk=projectId)
            
            total_projects = projects.count()
            
            # Aggregate statistics from prefetched tasks to avoid extra queries
            all_tasks = []
            for project in projects:
                all_tasks.extend(project.tasks.all())
            
            total_tasks = len(all_tasks)
            completed_tasks = sum(1 for task in all_tasks if task.status == 'DONE')
            active_tasks = sum(1 for task in all_tasks if task.status == 'IN_PROGRESS')
            
            completion_rate = round((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0.0
            
            return ProjectStatisticsType(
                totalProjects=total_projects,
                totalTasks=total_tasks,
                completedTasks=completed_tasks,
                activeTasks=active_tasks,
                completionRate=completion_rate
            )
        except Organization.DoesNotExist:
            return None

class CreateOrganization(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        slug = graphene.String(required=True)
        contactEmail = graphene.String(required=True)

    organization = graphene.Field(OrganizationType)

    def mutate(self, info, name, slug, contactEmail):
        organization = Organization(name=name, slug=slug, contact_email=contactEmail)
        organization.save()
        return CreateOrganization(organization=organization)

class CreateProject(graphene.Mutation):
    class Arguments:
        organizationSlug = graphene.String(required=True)
        name = graphene.String(required=True)
        description = graphene.String()
        status = graphene.String()
        dueDate = graphene.Date()

    project = graphene.Field(ProjectType)

    def mutate(self, info, organizationSlug, name, description="", status="ACTIVE", dueDate=None):
        try:
            organization = Organization.objects.get(slug=organizationSlug)
            project = Project(
                organization=organization,
                name=name,
                description=description,
                status=status,
                due_date=dueDate
            )
            project.save()
            return CreateProject(project=project)
        except Organization.DoesNotExist:
            raise Exception("Organization not found")

class CreateTask(graphene.Mutation):
    class Arguments:
        projectId = graphene.ID(required=True)
        organizationSlug = graphene.String(required=True)
        title = graphene.String(required=True)
        description = graphene.String()
        status = graphene.String()
        assigneeEmail = graphene.String()
        dueDate = graphene.DateTime()

    task = graphene.Field(TaskType)

    def mutate(self, info, projectId, organizationSlug, title, description="", status="TODO", assigneeEmail="", dueDate=None):
        try:
            project = Project.objects.get(pk=projectId, organization__slug=organizationSlug)
            task = Task(
                project=project,
                title=title,
                description=description,
                status=status,
                assignee_email=assigneeEmail,
                due_date=dueDate
            )
            task.save()
            return CreateTask(task=task)
        except Project.DoesNotExist:
            raise Exception("Project not found or does not belong to organization")

class UpdateProject(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        organizationSlug = graphene.String(required=True)
        name = graphene.String()
        description = graphene.String()
        status = graphene.String()
        dueDate = graphene.Date()

    project = graphene.Field(ProjectType)

    def mutate(self, info, id, organizationSlug, name=None, description=None, status=None, dueDate=None):
        try:
            project = Project.objects.get(pk=id, organization__slug=organizationSlug)
            if name is not None:
                project.name = name
            if description is not None:
                project.description = description
            if status is not None:
                project.status = status
            if dueDate is not None:
                project.due_date = dueDate
            project.save()
            return UpdateProject(project=project)
        except Project.DoesNotExist:
            raise Exception("Project not found or does not belong to organization")

class UpdateTask(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        organizationSlug = graphene.String(required=True)
        title = graphene.String()
        description = graphene.String()
        status = graphene.String()
        assigneeEmail = graphene.String()
        dueDate = graphene.DateTime()

    task = graphene.Field(TaskType)

    def mutate(self, info, id, organizationSlug, title=None, description=None, status=None, assigneeEmail=None, dueDate=None):
        try:
            task = Task.objects.get(pk=id, project__organization__slug=organizationSlug)
            if title is not None:
                task.title = title
            if description is not None:
                task.description = description
            if status is not None:
                task.status = status
            if assigneeEmail is not None:
                task.assignee_email = assigneeEmail
            if dueDate is not None:
                task.due_date = dueDate
            task.save()
            return UpdateTask(task=task)
        except Task.DoesNotExist:
            raise Exception("Task not found or does not belong to organization")

class CreateTaskComment(graphene.Mutation):
    class Arguments:
        taskId = graphene.ID(required=True)
        organizationSlug = graphene.String(required=True)
        content = graphene.String(required=True)
        authorEmail = graphene.String(required=True)

    comment = graphene.Field(TaskCommentType)

    def mutate(self, info, taskId, organizationSlug, content, authorEmail):
        try:
            task = Task.objects.get(pk=taskId, project__organization__slug=organizationSlug)
            comment = TaskComment(
                task=task,
                content=content,
                author_email=authorEmail
            )
            comment.save()
            return CreateTaskComment(comment=comment)
        except Task.DoesNotExist:
            raise Exception("Task not found or does not belong to organization")

class Mutation(graphene.ObjectType):
    create_organization = CreateOrganization.Field()
    create_project = CreateProject.Field()
    update_project = UpdateProject.Field()
    create_task = CreateTask.Field()
    update_task = UpdateTask.Field()
    create_task_comment = CreateTaskComment.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)
