import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@construct/components";
import { Users, Clock, Loader2, Eye } from "lucide-react";
import { useAppContext } from './__root'
import { useEffect, useState } from 'react';
import { getAgentQueue, AgentQueueItem } from '@/services/database';

export const Route = createFileRoute('/agents')({
  component: AgentsView,
})

function AgentsView() {
  const { agents, activeWorkspace } = useAppContext();
  const [queue, setQueue] = useState<AgentQueueItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeWorkspace) return;

    const loadQueue = async () => {
      const q = await getAgentQueue(activeWorkspace.id);
      setQueue(q);
    };

    loadQueue();
    const interval = setInterval(loadQueue, 3000);
    return () => clearInterval(interval);
  }, [activeWorkspace]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => {
        const manager = agents.find(
          (a) => a.id === agent.manager_agent_id,
        );
        const agentQueue = queue.filter(item => item.agent_id === agent.id && (item.status === 'pending' || item.status === 'processing'));
        const activeTask = agentQueue.find(item => item.status === 'processing');
        const pendingCount = agentQueue.filter(item => item.status === 'pending').length;

        return (
          <Card key={agent.id} className="relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: '/agents/$agentId', params: { agentId: agent.id.toString() } })}
              >
                <Eye className="size-4" />
              </Button>
            </div>
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Users className="size-6 text-primary" />
              </div>
              <CardTitle className="text-base">
                {agent.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
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

              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-center gap-2">
                  {activeTask ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 animate-pulse">
                      <Loader2 className="size-3 mr-1 animate-spin" />
                      Working on #{activeTask.ticket_id}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Idle</Badge>
                  )}
                </div>
                {pendingCount > 0 && (
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="size-3" />
                    {pendingCount} tasks pending
                  </div>
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
