import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useKnowledgeBase, useUpdateKnowledgeBase } from "@/hooks/use-knowledge-base";
import { useAgents } from "@/hooks/use-agents";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Pencil, Trash2, Upload, Globe, CheckCircle, X, FileUp } from "lucide-react";

interface FaqPair {
  question: string;
  answer: string;
}

interface Doc {
  id: string;
  filename: string;
  file_size_bytes: number;
  created_at: string;
  processing_status: string;
}

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: kb, isLoading } = useKnowledgeBase();
  const updateKb = useUpdateKnowledgeBase();
  const { data: agents = [] } = useAgents();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Company info
  const [companyInfo, setCompanyInfo] = useState("");
  const [companyDirty, setCompanyDirty] = useState(false);

  // FAQs
  const [faqs, setFaqs] = useState<FaqPair[]>([]);
  const [addingFaq, setAddingFaq] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  // Website
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // Agents
  const [assignedIds, setAssignedIds] = useState<string[]>([]);

  // Documents
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (kb) {
      setCompanyInfo(kb.company_info || "");
      setFaqs(Array.isArray(kb.faq_pairs) ? kb.faq_pairs : []);
      setWebsiteUrl(kb.website_url || "");
      setAssignedIds(Array.isArray(kb.assigned_agent_ids) ? kb.assigned_agent_ids : []);
    }
  }, [kb]);

  // Load documents
  useEffect(() => {
    if (!user?.tenant_id) return;
    supabase
      .from("documents")
      .select("id, filename, file_size_bytes, created_at, processing_status")
      .eq("tenant_id", user.tenant_id)
      .is("agent_id", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDocs(data || []));
  }, [user?.tenant_id]);

  const saveCompanyInfo = () => {
    updateKb.mutate({ company_info: companyInfo });
    setCompanyDirty(false);
  };

  // FAQ handlers
  const saveFaq = () => {
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    let updated: FaqPair[];
    if (editingIdx !== null) {
      updated = faqs.map((f, i) => (i === editingIdx ? { question: faqQuestion, answer: faqAnswer } : f));
    } else {
      updated = [...faqs, { question: faqQuestion, answer: faqAnswer }];
    }
    setFaqs(updated);
    updateKb.mutate({ faq_pairs: updated });
    resetFaqForm();
  };

  const deleteFaq = (idx: number) => {
    const updated = faqs.filter((_, i) => i !== idx);
    setFaqs(updated);
    updateKb.mutate({ faq_pairs: updated });
  };

  const startEditFaq = (idx: number) => {
    setEditingIdx(idx);
    setFaqQuestion(faqs[idx].question);
    setFaqAnswer(faqs[idx].answer);
    setAddingFaq(true);
  };

  const resetFaqForm = () => {
    setAddingFaq(false);
    setEditingIdx(null);
    setFaqQuestion("");
    setFaqAnswer("");
  };

  // File upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !user?.tenant_id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 10MB`, variant: "destructive" });
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "docx", "txt", "doc"].includes(ext || "")) {
          toast({ title: "Invalid file type", description: `${file.name} is not supported`, variant: "destructive" });
          continue;
        }
        const path = `${user.tenant_id}/kb/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
        if (uploadErr) throw uploadErr;
        const { error: dbErr } = await supabase.from("documents").insert({
          tenant_id: user.tenant_id,
          filename: file.name,
          storage_path: path,
          file_type: ext || "unknown",
          file_size_bytes: file.size,
          agent_id: null,
        });
        if (dbErr) throw dbErr;
      }
      // Refresh docs
      const { data } = await supabase
        .from("documents")
        .select("id, filename, file_size_bytes, created_at, processing_status")
        .eq("tenant_id", user.tenant_id)
        .is("agent_id", null)
        .order("created_at", { ascending: false });
      setDocs(data || []);
      toast({ title: "Documents uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: string) => {
    await supabase.from("documents").delete().eq("id", id);
    setDocs(docs.filter(d => d.id !== id));
    toast({ title: "Document deleted" });
  };

  // Website import — calls scrape-website edge function for real content extraction
  const handleImport = async () => {
    if (!websiteUrl.trim()) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-website", {
        body: { url: websiteUrl.trim() },
      });
      if (error) throw error;
      const { content, title, truncated } = data as { content: string; title: string; truncated: boolean };
      updateKb.mutate({
        website_url: websiteUrl.trim(),
        website_content: content,
        website_imported_at: new Date().toISOString(),
      });
      toast({
        title: `Website imported${title ? `: ${title}` : ""}`,
        description: `${content.length.toLocaleString()} characters extracted${truncated ? " (truncated)" : ""}`,
      });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // Agent assignments
  const toggleAgent = (agentId: string) => {
    setAssignedIds(prev =>
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    );
  };

  const saveAssignments = () => {
    updateKb.mutate({ assigned_agent_ids: assignedIds });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Drag and drop
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [user?.tenant_id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload documents, add FAQs, and paste company information. Your AI agents will reference this during calls to answer questions accurately.
        </p>
      </div>

      {/* Section 2: Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Information</CardTitle>
          <CardDescription>Paste your company's key details here. Your AI agents will use this to answer questions during calls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={companyInfo}
            onChange={e => { setCompanyInfo(e.target.value); setCompanyDirty(true); }}
            placeholder="Enter your company details, office hours, services offered, carriers represented, etc."
            className="min-h-[200px] resize-y"
            maxLength={50000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Characters: {companyInfo.length.toLocaleString()} / 50,000</span>
            <Button onClick={saveCompanyInfo} disabled={!companyDirty || updateKb.isPending} size="sm">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: FAQ Pairs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          <CardDescription>Add questions your clients commonly ask. The AI will use these exact answers during calls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.length === 0 && !addingFaq && (
            <p className="text-sm text-muted-foreground py-4 text-center">No FAQs added yet. Click below to add your first one.</p>
          )}
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">Q: {faq.question}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">A: {faq.answer}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditFaq(idx)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteFaq(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {addingFaq && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div>
                <Label className="text-sm">Question</Label>
                <Input value={faqQuestion} onChange={e => setFaqQuestion(e.target.value)} placeholder="What do clients ask?" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Answer</Label>
                <Textarea value={faqAnswer} onChange={e => setFaqAnswer(e.target.value)} placeholder="How should the AI respond?" className="mt-1 min-h-[80px]" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveFaq} disabled={!faqQuestion.trim() || !faqAnswer.trim()}>
                  {editingIdx !== null ? "Update FAQ" : "Save FAQ"}
                </Button>
                <Button size="sm" variant="outline" onClick={resetFaqForm}>Cancel</Button>
              </div>
            </div>
          )}

          {!addingFaq && (
            <Button variant="outline" size="sm" onClick={() => setAddingFaq(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add FAQ
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents</CardTitle>
          <CardDescription>Upload PDFs, Word docs, or text files. The AI will reference the content during calls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {uploading ? "Uploading…" : "Drop files here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Accepted: PDF, DOCX, TXT — Max 10MB per file</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.txt"
              multiple
              onChange={e => handleFileUpload(e.target.files)}
            />
          </div>

          {docs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Uploaded Documents</p>
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(doc.file_size_bytes)} · Uploaded {formatDate(doc.created_at)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Website Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import From Website</CardTitle>
          <CardDescription>Paste your website URL and we'll extract key information automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              className="flex-1"
            />
            <Button onClick={handleImport} disabled={importing || !websiteUrl.trim()}>
              {importing ? "Importing…" : "Import"}
            </Button>
          </div>
          {kb?.website_imported_at && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              <span>Successfully imported content from {kb.website_url}</span>
              <span className="text-muted-foreground">· Last imported: {formatDate(kb.website_imported_at)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Agent Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assign to Agents</CardTitle>
          <CardDescription>Select which agents should have access to this knowledge base.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No agents created yet.</p>
          ) : (
            agents.map(agent => (
              <label key={agent.id} className="flex items-center gap-3 cursor-pointer py-1">
                <Checkbox
                  checked={assignedIds.includes(agent.id)}
                  onCheckedChange={() => toggleAgent(agent.id)}
                />
                <span className="text-sm text-foreground font-medium">{agent.agent_name}</span>
                {agent.agent_title && <span className="text-xs text-muted-foreground">— {agent.agent_title}</span>}
                {agent.status === "draft" && <Badge variant="secondary" className="text-xs">Draft</Badge>}
              </label>
            ))
          )}
          <Button size="sm" onClick={saveAssignments} disabled={updateKb.isPending}>
            Save Assignments
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
