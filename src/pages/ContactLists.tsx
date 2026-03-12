import { useState, useMemo } from "react";
import { contactLists, contacts } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Download, Trash2, Upload } from "lucide-react";

const sourceColors: Record<string, string> = {
  "CSV Upload": "bg-blue-50 text-blue-600",
  "CRM Sync": "bg-purple-50 text-purple-600",
  "Manual": "bg-secondary text-muted-foreground",
};

export default function ContactLists() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");

  const filteredLists = useMemo(() => {
    if (!search) return contactLists;
    return contactLists.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts;
    return contacts.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch));
  }, [contactSearch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Contact Lists</h1>
        <Button onClick={() => toast({ title: "Upload dialog would open" })}><Plus className="h-4 w-4 mr-2" /> Upload New List</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search lists..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50">
                {["List Name", "Contacts", "Valid", "Created", "Last Used", "Source", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLists.map((l, i) => (
                <tr key={l.id} className={`border-t hover:bg-secondary/20 cursor-pointer ${i % 2 ? "bg-secondary/10" : ""}`} onClick={() => setSelectedList(l.id)}>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{l.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{l.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{l.validCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{l.created}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{l.lastUsed ? `${l.lastUsed} — ${l.lastUsedCampaign}` : "Not yet used"}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className={`${sourceColors[l.source]} border-0 text-[10px]`}>{l.source}</Badge></td>
                  <td className="px-4 py-3 flex gap-1">
                    <button onClick={e => { e.stopPropagation(); toast({ title: "List downloaded" }); }} className="p-1 rounded hover:bg-secondary"><Download className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={e => { e.stopPropagation(); toast({ title: "List deleted", variant: "destructive" }); }} className="p-1 rounded hover:bg-secondary"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Contact Detail Dialog */}
      <Dialog open={!!selectedList} onOpenChange={() => setSelectedList(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{contactLists.find(l => l.id === selectedList)?.name || "Contacts"}</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} className="pl-9" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                {["Name", "Phone", "Email", "Company", "DNC", "Last Called", "Outcome"].map(h => (
                  <th key={h} className="px-3 py-2 text-left section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredContacts.slice(0, 15).map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 text-foreground">{c.firstName} {c.lastName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.phone}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.company}</td>
                  <td className="px-3 py-2">{c.dncStatus ? <Badge variant="destructive" className="text-[10px]">DNC</Badge> : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.lastCalled || "—"}</td>
                  <td className="px-3 py-2">{c.outcome ? <Badge variant="secondary" className="text-[10px]">{c.outcome}</Badge> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
