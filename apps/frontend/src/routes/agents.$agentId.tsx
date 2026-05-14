import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  ScrollArea,
} from "@construct/components";
import { ArrowLeft, Users, Folder, Ticket as TicketIcon } from "lucide-react";
import { useAppContext } from './__root'
import { Ticket } from '@/services/database';

export const Route = createFileRoute('/agents/$agentId')({
  component: AgentDetailsView,
})

const STATUS_COLUMNS: { label: string; value: Ticket["status"] }[] = [
  { label: "Open", value: "open" },
  { label: "Researching", value: "researching" },
  { label: "Planning", value: "planning" },
  { label: "In Progress", value: "in_progress" },
  { label: "Review", value: "review" },
  { label: "Done", value: "done" },
  { label: "Cancelled", value: "cancelled" },
];

function AgentDetailsView() {
  const { agentId } = Route.useParams();
  const { agents, tickets, projects } = useAppContext();

  const agent = agents.find((a) => a.id.toString() === agentId);
  const agentTickets = tickets.filter((t) => t.assigned_agent_id?.toString() === agentId);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-2xl font-bold">Agent not found</h2>
        <Link to="/agents">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/agents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{agent.name}</h2>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="uppercase">{agent.acp_id}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full grid grid-cols-7 gap-4 min-w-[1400px]">
          {STATUS_COLUMNS.map((column) => {
            const columnTickets = agentTickets.filter((t) => t.status === column.value);
            return (
              <div key={column.value} className="flex flex-col bg-muted/30 rounded-lg border border-border overflow-hidden">
                <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    {column.label}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {columnTickets.length}
                  </Badge>
                </div>
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2">
                    {columnTickets.map((ticket) => {
                      const project = projects.find(p => p.id === ticket.project_id);
                      return (
                        <Link
                          key={ticket.id}
                          to="/tickets/$ticketId"
                          params={{ ticketId: ticket.id.toString() }}
                        >
                          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                            <CardContent className="p-3 space-y-2">
                              <div className="text-sm font-medium leading-tight line-clamp-2">
                                {ticket.title}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                                  <Folder className="size-3 shrink-0" />
                                  <span className="truncate">{project?.name || "Unknown"}</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-4 px-1 uppercase ${
                                    ticket.priority === 'urgent' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''
                                  }`}
                                >
                                  {ticket.priority}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                    {columnTickets.length === 0 && (
                      <div className="text-center py-8 text-[10px] text-muted-foreground italic">
                        No tickets
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
