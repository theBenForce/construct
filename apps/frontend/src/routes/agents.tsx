import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@construct/components";
import { Users } from "lucide-react";
import { useAppContext } from './__root'

export const Route = createFileRoute('/agents')({
  component: AgentsView,
})

function AgentsView() {
  const { agents } = useAppContext();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => {
        const manager = agents.find(
          (a) => a.id === agent.manager_agent_id,
        );
        return (
          <Card key={agent.id}>
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Users className="size-6 text-primary" />
              </div>
              <CardTitle className="text-base">
                {agent.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="secondary" className="uppercase">
                  {agent.acp_id}
                </Badge>
                {manager && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="size-3" />
                    Manager: {manager.name}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {agents.length === 0 && (
        <div className="col-span-full py-12 text-center text-muted-foreground">
          No agents in this swarm yet.
        </div>
      )}
    </div>
  );
}
