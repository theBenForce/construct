import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@construct/components";
import { useAppContext } from './__root'

export const Route = createFileRoute('/projects')({
  component: ProjectsView,
})

function ProjectsView() {
  const { projects } = useAppContext();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {project.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground break-all">
              {project.local_path}
            </div>
          </CardContent>
        </Card>
      ))}
      {projects.length === 0 && (
        <div className="col-span-full py-12 text-center text-muted-foreground">
          No projects in this swarm yet.
        </div>
      )}
    </div>
  );
}
