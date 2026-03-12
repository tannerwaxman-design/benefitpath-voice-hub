import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { campaigns } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { MoreVertical, Plus, Search } from "lucide-react";

const statusColors: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Paused: "bg-warning/10 text-warning",
  Draft: "bg-secondary text-muted-foreground",
  Completed: "bg-blue-50 text-blue-600",
  Scheduled: "bg-purple-50 text-purple-600",
};

export default function Campaigns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const filtered = useMemo(() => {
    let result = [...campaigns];
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "All") result = result.filter(c => c.status === statusFilter);
    if (sortBy === "newest") result.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
    if (sortBy === "calls") result.sort((a, b) => b.contactsCalled - a.contactsCalled);
    if (sortBy === "conversion") result.sort((a, b) => b.conversionRate - a.conversionRate);
    return result;
  }, [search, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Campaigns</h1>
        <Button onClick={() => navigate("/campaigns/new")}><Plus className="h-4 w-4 mr-2" /> Create Campaign</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Active", "Paused", "Draft", "Completed", "Scheduled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="calls">Most Calls</SelectItem>
            <SelectItem value="conversion">Highest Conversion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50">
                  {["Campaign Name", "Agent", "Status", "Contacts", "Connected", "Appointments", "Conversion", "Start Date", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`border-t hover:bg-secondary/20 cursor-pointer ${i % 2 === 0 ? "" : "bg-secondary/10"}`} onClick={() => navigate(`/campaigns/${c.id}`)}>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.agentName}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className={`${statusColors[c.status]} border-0 text-[10px]`}>{c.status}</Badge></td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">{c.contactsCalled} / {c.contactsTotal}</span>
                      <div className="w-20 bg-secondary rounded-full h-1 mt-1">
                        <div className="bg-primary h-1 rounded-full" style={{ width: `${c.contactsTotal ? (c.contactsCalled / c.contactsTotal) * 100 : 0}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.connected}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.appointments}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${c.conversionRate > 10 ? "text-success" : c.conversionRate > 5 ? "text-warning" : "text-destructive"}`}>{c.conversionRate}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.startDate || "—"}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary"><MoreVertical className="h-4 w-4 text-muted-foreground" /></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>{c.status === "Active" ? "Pause" : "Resume"}</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
