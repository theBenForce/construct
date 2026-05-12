import { useEffect, useState } from "react";
import { 
  getWorkspaces, 
  Workspace,
  getProjects,
  Project,
  getAgents,
  Agent,
  getTickets,
  Ticket
} from "./services/database";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  ScrollArea,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@construct/components";
import { Plus, Settings, Briefcase, Users, Ticket as TicketIcon, Folder, Play, Eye } from "lucide-react";
import { AddProjectDialog } from "./components/AddProjectDialog";
import { AddAgentDialog } from "./components/AddAgentDialog";
import { AddTicketDialog } from "./components/AddTicketDialog";
import { AddWorkspaceDialog } from "./components/AddWorkspaceDialog";
import { DiffViewerDialog } from "./components/DiffViewerDialog";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [activeTab, setActiveTab] = useState<"projects" | "agents" | "tickets">("projects");

  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  
  const [showDiff, setShowDiff] = useState(false);
  const [currentDiff, setCurrentDiff] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceData(activeWorkspace.id);
    } else {
      setProjects([]);
      setAgents([]);
      setTickets([]);
    }
  }, [activeWorkspace]);

  async function loadWorkspaces(selectId?: number) {
    const ws = await getWorkspaces();
    setWorkspaces(ws);
    if (selectId) {
      const selected = ws.find(w => w.id === selectId);
      if (selected) setActiveWorkspace(selected);
    } else if (ws.length > 0 && !activeWorkspace) {
      setActiveWorkspace(ws[0]);
    }
  }

  async function loadWorkspaceData(workspaceId: number) {
    const [p, a, t] = await Promise.all([
      getProjects(workspaceId),
      getAgents(workspaceId),
      getTickets(workspaceId)
    ]);
    setProjects(p);
    setAgents(a);
    setTickets(t);
  }

  const handleRefresh = () => {
    if (activeWorkspace) loadWorkspaceData(activeWorkspace.id);
  };

  async function handleStartWork(ticket: Ticket) {
    const project = projects.find(p => p.id === ticket.project_id);
    const agent = agents.find(a => a.id === ticket.assigned_agent_id);
    
    if (!project || !agent) {
      alert("Project or Agent not found for this ticket.");
      return;
    }

    setIsWorking(true);
    try {
      const worktreePath = await invoke<string>("create_worktree", { 
        repoPath: project.local_path, 
        ticketId: ticket.id.toString() 
      });

      if (project.init_commands) {
        await invoke("run_init_commands", { 
          worktreePath, 
          commands: project.init_commands 
        });
      }

      await invoke("run_agent", {
        cliCmd: agent.cli_path || agent.backend_type,
        args: agent.backend_type === "gemini" ? ["--acp"] : 
              agent.backend_type === "cursor" ? ["acp"] : ["--bare"],
        worktreePath,
        prompt: ticket.description || ticket.title,
        useAcp: agent.backend_type !== "claude"
      });

      const diff = await invoke<string>("get_diff", { worktreePath });
      setCurrentDiff(diff);
      setShowDiff(true);
    } catch (err) {
      console.error(err);
      alert(`Error: ${err}`);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 border-r border-border flex flex-col bg-muted/30">
        <div className="p-4 border-b border-border flex gap-2 items-center">
          <Select 
            value={activeWorkspace?.id.toString()} 
            onValueChange={(val) => {
              if (val === "new") {
                setShowAddWorkspace(true);
              } else {
                setActiveWorkspace(workspaces.find(w => w.id.toString() === val) || null);
              }
            }}
          >
            <SelectTrigger className="flex-1 h-9 bg-background">
              <SelectValue placeholder="Select swarm..." />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map(ws => (
                <SelectItem key={ws.id} value={ws.id.toString()}>{ws.name}</SelectItem>
              ))}
              <div className="h-px bg-muted my-1" />
              <SelectItem value="new" className="text-primary font-medium focus:text-primary">
                <div className="flex items-center">
                  <Plus className="size-3 mr-2" />
                  New Swarm
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon-sm" className="shrink-0">
            <Settings className="size-4" />
          </Button>
        </div>
        
        <nav className="flex-1 p-2 space-y-1">
          <button 
            disabled={!activeWorkspace}
            onClick={() => setActiveTab("projects")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 ${
              activeTab === "projects" && activeWorkspace
                ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Folder className="size-4" />
            Projects
          </button>
          <button 
            disabled={!activeWorkspace}
            onClick={() => setActiveTab("agents")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 ${
              activeTab === "agents" && activeWorkspace
                ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="size-4" />
            Agents
          </button>
          <button 
            disabled={!activeWorkspace}
            onClick={() => setActiveTab("tickets")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 ${
              activeTab === "tickets" && activeWorkspace
                ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <TicketIcon className="size-4" />
            Tickets
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeWorkspace ? (
          <>
            <header className="p-4 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-md sticky top-0 z-10">
              <h1 className="text-2xl font-bold capitalize">{activeTab}</h1>
              <div className="flex gap-2">
                {activeTab === "projects" && (
                  <Button size="sm" onClick={() => setShowAddProject(true)}>
                    <Plus className="size-4 mr-2" /> Add Project
                  </Button>
                )}
                {activeTab === "agents" && (
                  <Button size="sm" onClick={() => setShowAddAgent(true)}>
                    <Plus className="size-4 mr-2" /> Add Agent
                  </Button>
                )}
                {activeTab === "tickets" && (
                  <Button size="sm" onClick={() => setShowAddTicket(true)}>
                    <Plus className="size-4 mr-2" /> Create Ticket
                  </Button>
                )}
              </div>
            </header>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {activeTab === "projects" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((p) => (
                      <Card key={p.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{p.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground truncate">{p.repo_url || "Local only"}</p>
                          <p className="text-xs text-muted-foreground mt-2 font-mono truncate">{p.local_path}</p>
                        </CardContent>
                      </Card>
                    ))}
                    {projects.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <Folder className="size-12 mb-4" />
                        <p className="text-muted-foreground">No projects in this swarm.</p>
                        <Button variant="link" onClick={() => setShowAddProject(true)}>Add your first project</Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "agents" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((a) => (
                      <Card key={a.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{a.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="capitalize">
                              {a.backend_type}
                            </Badge>
                            {a.manager_agent_id && (
                              <Badge variant="outline">
                                Managed
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {agents.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <Users className="size-12 mb-4" />
                        <p className="text-muted-foreground">No agents configured.</p>
                        <Button variant="link" onClick={() => setShowAddAgent(true)}>Define an agent</Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "tickets" && (
                  <div className="space-y-2">
                    {tickets.map((t) => (
                      <Card key={t.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{t.title}</h3>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] h-4 uppercase">
                                {t.status}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] h-4 uppercase">
                                {t.priority}
                              </Badge>
                              {t.assigned_agent_id && (
                                <Badge className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20">
                                  {agents.find(a => a.id === t.assigned_agent_id)?.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {t.assigned_agent_id && (
                              <Button 
                                size="sm" 
                                variant="default" 
                                disabled={isWorking}
                                onClick={() => handleStartWork(t)}
                              >
                                <Play className="size-3 mr-2" />
                                {isWorking ? "Working..." : "Start Work"}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon-sm">
                              <Eye className="size-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {tickets.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <TicketIcon className="size-12 mb-4" />
                        <p className="text-muted-foreground">The backlog is empty.</p>
                        <Button variant="link" onClick={() => setShowAddTicket(true)}>Create a ticket</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            <AddProjectDialog 
              open={showAddProject} 
              onOpenChange={setShowAddProject}
              workspaceId={activeWorkspace.id}
              onSuccess={handleRefresh}
            />
            <AddAgentDialog 
              open={showAddAgent} 
              onOpenChange={setShowAddAgent}
              workspaceId={activeWorkspace.id}
              availableAgents={agents}
              onSuccess={handleRefresh}
            />
            <AddTicketDialog 
              open={showAddTicket} 
              onOpenChange={setShowAddTicket}
              workspaceId={activeWorkspace.id}
              projects={projects}
              agents={agents}
              onSuccess={handleRefresh}
            />
            <DiffViewerDialog 
              open={showDiff}
              onOpenChange={setShowDiff}
              diff={currentDiff}
              onApprove={() => {
                alert("Changes approved and committed (simulation)");
                setShowDiff(false);
              }}
              onReject={() => {
                alert("Changes rejected and cleaned up (simulation)");
                setShowDiff(false);
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Briefcase className="size-16 text-muted-foreground mb-4 opacity-20" />
            <h1 className="text-3xl font-bold mb-2">Welcome to Construct</h1>
            <p className="text-muted-foreground max-w-md mb-8">
              Construct helps you orchestrate AI swarms across your projects. 
              Select a swarm from the dropdown or create a new one to begin.
            </p>
            <Button onClick={() => setShowAddWorkspace(true)}>
              <Plus className="size-4 mr-2" />
              Create New Swarm
            </Button>
          </div>
        )}
      </main>

      <AddWorkspaceDialog 
        open={showAddWorkspace}
        onOpenChange={setShowAddWorkspace}
        onSuccess={(id) => {
          loadWorkspaces(id);
        }}
      />
    </div>
  );
}

export default App;
