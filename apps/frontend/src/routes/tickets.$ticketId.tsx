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
import {
  getTicketMessages,
  TicketMessage,
  createTicketMessage,
  updateTicketStatus,
  Ticket,
} from "@/services/database";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Route = createFileRoute('/tickets/$ticketId')({
  component: TicketDetailsView,
})

const STATUS_OPTIONS: { label: string; value: Ticket["status"] }[] = [
  { label: "Open", value: "open" },
  { label: "Researching", value: "researching" },
  { label: "Planning", value: "planning" },
  { label: "In Progress", value: "in_progress" },
  { label: "Review", value: "review" },
  { label: "Done", value: "done" },
  { label: "Cancelled", value: "cancelled" },
];

function TicketDetailsView() {
  const { ticketId } = Route.useParams();
  const { tickets, projects, agents, activeWorkspace, loadWorkspaceData } = useAppContext();
  
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
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
  }, [messages, streamingContent]);

  useEffect(() => {
    if (!ticketId) return;

    let unlistenChunk: (() => void) | undefined;
    let unlistenCompleted: (() => void) | undefined;

    async function setupListeners() {
      unlistenChunk = await listen<string>(`agent-chunk-${ticketId}`, (event) => {
        setStreamingContent((prev) => prev + event.payload);
      });

      unlistenCompleted = await listen(`agent-completed-${ticketId}`, () => {
        setStreamingContent("");
        loadMessages();
        setIsSending(false);
        if (activeWorkspace) {
          loadWorkspaceData(activeWorkspace.id);
        }
      });
    }

    setupListeners();

    return () => {
      if (unlistenChunk) unlistenChunk();
      if (unlistenCompleted) unlistenCompleted();
    };
  }, [ticketId, activeWorkspace]);

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
      await invoke("enqueue_message", {
        agentId: agentIdNum,
        ticketId: ticket.id,
        content: newMessage,
      });
      setNewMessage("");
      await loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error: " + error);
      setIsSending(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!ticket || !activeWorkspace) return;
    try {
      await updateTicketStatus(ticket.id, status as Ticket["status"]);
      await loadWorkspaceData(activeWorkspace.id);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status: " + error);
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
            <div className="flex gap-2 mt-1 items-center">
              <Select value={ticket.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 px-2 text-xs w-[140px] uppercase font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs uppercase font-semibold">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="uppercase">{ticket.priority}</Badge>
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
                          <div className={`p-3 rounded-lg text-sm text-foreground ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
                            {msg.role === 'user' ? (
                              msg.content
                            ) : (
                              <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {streamingContent && (
                    <div className="flex gap-3">
                      <div className="shrink-0 size-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                        <Bot className="size-4" />
                      </div>
                      <div className="max-w-[80%] space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          {agents.find(a => a.id === parseInt(selectedAgentId))?.name || "Agent"}
                        </div>
                        <div className="p-3 rounded-lg text-sm bg-muted text-foreground rounded-tl-none relative">
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words inline-block">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {streamingContent}
                            </ReactMarkdown>
                          </div>
                          <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse align-middle" />
                        </div>
                      </div>
                    </div>
                  )}
                  {messages.length === 0 && !streamingContent && (
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
