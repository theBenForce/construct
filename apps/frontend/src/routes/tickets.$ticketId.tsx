import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@construct/components";
import { ArrowLeft, Folder, Users } from "lucide-react";
import { useAppContext } from './__root'

export const Route = createFileRoute('/tickets/$ticketId')({
  component: TicketDetailsView,
})

function TicketDetailsView() {
  const { ticketId } = Route.useParams();
  const { tickets, projects, agents } = useAppContext();

  const ticket = tickets.find((t) => t.id.toString() === ticketId);
  const project = projects.find((p) => p.id === ticket?.project_id);
  const agent = agents.find((a) => a.id === ticket?.assigned_agent_id);

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-2xl font-bold">Ticket not found</h2>
        <Link to="/tickets">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/tickets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{ticket.title}</h2>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{ticket.status}</Badge>
              <Badge variant="secondary">{ticket.priority}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {ticket.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {/* Chat Interface Placeholder */}
          <Card className="flex-1 flex flex-col min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Chat History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground italic">
              Chat interface coming in Step 5...
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Folder className="h-3 w-3" /> Project
                </div>
                <div className="text-sm font-medium">{project?.name || "Unknown"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Assigned Agent
                </div>
                <div className="text-sm font-medium">{agent?.name || "Unassigned"}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
