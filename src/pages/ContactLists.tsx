import { useState, useMemo } from "react";
import { useContactLists, useContacts, useCreateContactList } from "@/hooks/use-contacts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Download, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";

const sourceColors: Record<string, string> = {
  csv_upload: "bg-blue-50 text-blue-600",
  crm_sync: "bg-purple-50 text-purple-600",
  manual: "bg-secondary text-muted-foreground",
};

export default function ContactLists() {
  const { toast } = useToast();
  const { data: lists, isLoading } = useContactLists();
  const [search, setSearch] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [csvName, setCsvName] = useState("");
  const [csvContacts, setCsvContacts] = useState<Array<{ first_name: string; last_name: string; phone: string; email?: string; company?: string }>>([]);
  const createList = useCreateContactList();

  const { data: contacts } = useContacts(selectedListId);

  const filteredLists = useMemo(() => {
    if (!lists) return [];
    if (!search) return lists;
    return lists.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  }, [lists, search]);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!contactSearch) return contacts;
    return contacts.filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch));
  }, [contacts, contactSearch]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvName(file.name.replace(/\.(csv|tsv)$/i, ""));
    Papa.parse(file, {
      header: true,
      complete: (result) => {
        const parsed = (result.data as Record<string, string>[]).filter(r => r.phone || r.Phone || r["Phone Number"]).map(r => ({
          first_name: r.first_name || r["First Name"] || r.firstName || "Unknown",
          last_name: r.last_name || r["Last Name"] || r.lastName || "Contact",
          phone: r.phone || r.Phone || r["Phone Number"] || "",
          email: r.email || r.Email || undefined,
          company: r.company || r.Company || undefined,
        }));
        setCsvContacts(parsed);
        toast({ title: `Parsed ${parsed.length} contacts` });
      },
    });
  };

  const handleCreateList = async () => {
    if (!csvName.trim() || csvContacts.length === 0) {
      toast({ title: "Upload a CSV first", variant: "destructive" });
      return;
    }
    await createList.mutateAsync({ name: csvName, contacts: csvContacts });
    setShowUpload(false);
    setCsvContacts([]);
    setCsvName("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Contact Lists</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Contact Lists</h1>
        <Button onClick={() => setShowUpload(true)}><Plus className="h-4 w-4 mr-2" /> Upload New List</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search lists..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filteredLists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-foreground mb-2">No contact lists yet</p>
            <p className="text-sm text-muted-foreground mb-4">Upload a CSV to create your first contact list.</p>
            <Button onClick={() => setShowUpload(true)}><Plus className="h-4 w-4 mr-2" /> Upload CSV</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50">
                  {["List Name", "Contacts", "Valid", "Created", "Source", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLists.map((l, i) => (
                  <tr key={l.id} className={`border-t hover:bg-secondary/20 cursor-pointer ${i % 2 ? "bg-secondary/10" : ""}`} onClick={() => setSelectedListId(l.id)}>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{l.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.total_contacts.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{l.valid_contacts.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className={`${sourceColors[l.source] || "bg-secondary"} border-0 text-[10px]`}>{l.source.replace("_", " ")}</Badge></td>
                    <td className="px-4 py-3 flex gap-1">
                      <button onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary"><Download className="h-4 w-4 text-muted-foreground" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Contact Detail Dialog */}
      <Dialog open={!!selectedListId} onOpenChange={() => setSelectedListId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{lists?.find(l => l.id === selectedListId)?.name || "Contacts"}</DialogTitle>
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
              {filteredContacts.slice(0, 50).map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 text-foreground">{c.first_name} {c.last_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.phone}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.company || "—"}</td>
                  <td className="px-3 py-2">{c.dnc_status ? <Badge variant="destructive" className="text-[10px]">DNC</Badge> : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.last_called_at ? new Date(c.last_called_at).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-2">{c.last_outcome ? <Badge variant="secondary" className="text-[10px]">{c.last_outcome}</Badge> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Contact List</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>List Name</Label><Input value={csvName} onChange={e => setCsvName(e.target.value)} placeholder="e.g., Q2 Leads" /></div>
            <label className="block border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <input type="file" accept=".csv,.tsv" className="hidden" onChange={handleCsvUpload} />
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground">Drop CSV here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Headers: First Name, Last Name, Phone, Email, Company</p>
            </label>
            {csvContacts.length > 0 && (
              <p className="text-sm text-foreground">{csvContacts.length} contacts parsed</p>
            )}
            <Button className="w-full" onClick={handleCreateList} disabled={createList.isPending || csvContacts.length === 0}>
              {createList.isPending ? "Creating..." : `Create List (${csvContacts.length} contacts)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
