import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useRef } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@construct/components";
import { ArrowLeft, Folder, Users, Send, Bot, User, RefreshCw } from "lucide-react";
import { useAppContext } from './__root'
import { getTicketMessages, TicketMessage, createTicketMessage } from "@/services/database";
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute('/tickets/$ticketId')({
  component: TicketDetailsView,
})

function TicketDetailsView() {
  const { ticketId } = Route.useParams();
  const { tickets, projects, agents, activeWorkspace } = useAppContext();
  
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ticket = tickets.find((t) => t.id.toString() === ticketId);
  const project = projects.find((p) => p.id === ticket?.project_id);
  const agent = agents.find((a) => a.id === ticket?.assigned_agent_id);

  useEffect(() => {
    if (ticket) {
      loadMessages();
      if (ticket.assigned_agent_id) {
        setSelectedAgentId(ticket.assigned_agent_id.toString());
      }
    }
  }, [ticket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  async function loadMessages() {
    if (!ticket) return;
    const msgs = await getTicketMessages(ticket.id);
    setMessages(msgs);
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !ticket || !activeWorkspace || !selectedAgentId || !project) return;

    setIsSending(true);
    const agentIdNum = parseInt(selectedAgentId);
    const targetAgent = agents.find(a => a.id === agentIdNum);

    if (!targetAgent) {
      setIsSending(false);
      return;
    }

    try {
      // 1. Save User Message
      await createTicketMessage({
        ticket_id: ticket.id,
        role: "user",
        content: newMessage,
        agent_id: agentIdNum,
      });
      const userPrompt = newMessage;
      setNewMessage("");
      await loadMessages();

      // 2. Prepare Worktree
      const worktreePath = await invoke<string>("create_worktree", {
        repoPath: project.local_path,
        ticketId: ticket.id.toString(),
      });

      if (project.init_commands) {
        await invoke("run_init_commands", {
          worktreePath,
          commands: project.init_commands,
        });
      }

      // 3. Run Agent
      const response = await invoke<string>("run_agent", {
        acpId: targetAgent.acp_id,
        worktreePath,
        prompt: userPrompt,
        workspaceId: activeWorkspace.id,
      });

      // 4. Save Agent Response
      await createTicketMessage({
        ticket_id: ticket.id,
        role: "agent",
        content: response,
        agent_id: agentIdNum,
      });
      await loadMessages();
      
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error: " + error);
    } finally {
      setIsSending(false);
    }
  }

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
        <div className="md:col-span-2 flex flex-col space-y-6 overflow-hidden">
          <Card className="shrink-0">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {ticket.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
            <CardHeader className="py-3 shrink-0">
              <CardTitle className="text-sm font-medium">Chat History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
              <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const msgAgent = agents.find(a => a.id === msg.agent_id);
                    const isAgent = msg.role === 'agent';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`shrink-0 size-8 rounded-full flex items-center justify-center ${isAgent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {isAgent ? <Bot className="size-4" /> : <User className="size-4" />}
                        </div>
                        <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                          <div className="text-xs font-medium text-muted-foreground">
                            {isAgent ? (msgAgent?.name || "Agent") : "You"}
                          </div>
                          <div className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
                            {msg.content}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground text-sm italic">
                      No messages yet. Send a prompt to an agent to start the conversation.
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border space-y-4 shrink-0">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isSending}
                    />
                  </div>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Target Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim() || !selectedAgentId}>
                    {isSending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </div>
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
