import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
  example: string;
}

const endpoints: Record<string, Endpoint[]> = {
  contacts: [
    {
      method: "GET",
      path: "/contacts",
      description: "List contacts with pagination",
      params: [
        { name: "limit", type: "number", required: false, description: "Max results (default 50, max 200)" },
        { name: "offset", type: "number", required: false, description: "Pagination offset" },
        { name: "list_id", type: "string", required: false, description: "Filter by contact list ID" },
      ],
      response: `{ "contacts": [...], "total": 150 }`,
      example: `curl -H "Authorization: Bearer bp_YOUR_KEY" "${BASE_URL}/contacts?limit=10"`,
    },
    {
      method: "POST",
      path: "/contacts",
      description: "Create a new contact",
      body: [
        { name: "first_name", type: "string", required: true, description: "Contact first name" },
        { name: "last_name", type: "string", required: false, description: "Contact last name" },
        { name: "phone", type: "string", required: true, description: "Phone number (E.164 format)" },
        { name: "email", type: "string", required: false, description: "Email address" },
        { name: "contact_list_id", type: "string", required: false, description: "Contact list to add to" },
      ],
      response: `{ "contact": { "id": "...", "first_name": "John", ... } }`,
      example: `curl -X POST -H "Authorization: Bearer bp_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"first_name":"John","phone":"+15551234567"}' \\
  "${BASE_URL}/contacts"`,
    },
  ],
  calls: [
    {
      method: "GET",
      path: "/calls",
      description: "List call history with filters",
      params: [
        { name: "limit", type: "number", required: false, description: "Max results (default 50)" },
        { name: "offset", type: "number", required: false, description: "Pagination offset" },
        { name: "outcome", type: "string", required: false, description: "Filter by outcome (connected, voicemail, no_answer, etc.)" },
        { name: "agent_id", type: "string", required: false, description: "Filter by agent" },
      ],
      response: `{ "calls": [...], "total": 500 }`,
      example: `curl -H "Authorization: Bearer bp_YOUR_KEY" "${BASE_URL}/calls?limit=20&outcome=connected"`,
    },
    {
      method: "GET",
      path: "/calls/:id",
      description: "Get call details including transcript",
      params: [{ name: "id", type: "string", required: true, description: "Call ID" }],
      response: `{ "call": { "id": "...", "transcript": [...], "sentiment": "positive", ... } }`,
      example: `curl -H "Authorization: Bearer bp_YOUR_KEY" "${BASE_URL}/calls/CALL_ID"`,
    },
    {
      method: "POST",
      path: "/calls/trigger",
      description: "Trigger an outbound call",
      body: [
        { name: "agent_id", type: "string", required: true, description: "Agent to use for the call" },
        { name: "phone_number", type: "string", required: true, description: "Number to call (E.164)" },
        { name: "contact_id", type: "string", required: false, description: "Link call to existing contact" },
      ],
      response: `{ "call_id": "...", "status": "initiated" }`,
      example: `curl -X POST -H "Authorization: Bearer bp_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id":"AGENT_ID","phone_number":"+15551234567"}' \\
  "${BASE_URL}/calls/trigger"`,
    },
  ],
  agents: [
    {
      method: "GET",
      path: "/agents",
      description: "List all active agents",
      response: `{ "agents": [{ "id": "...", "agent_name": "Sarah", "status": "active", ... }] }`,
      example: `curl -H "Authorization: Bearer bp_YOUR_KEY" "${BASE_URL}/agents"`,
    },
  ],
};

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600",
  POST: "bg-blue-500/10 text-blue-600",
  PUT: "bg-amber-500/10 text-amber-600",
  DELETE: "bg-destructive/10 text-destructive",
};

export default function ApiDocs() {
  const { toast } = useToast();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Book className="h-6 w-6 text-primary" /> API Documentation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use the BenefitPath API to integrate with external tools, CRMs, and automation platforms.
        </p>
      </div>

      {/* Authentication */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Authentication</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All API requests require a Bearer token in the Authorization header. Generate your API key from{" "}
            <a href="/settings" className="text-primary hover:underline">Settings &gt; Team & Access</a>.
          </p>
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Headers</span>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => copyCode('Authorization: Bearer bp_YOUR_API_KEY')}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
            </div>
            <pre className="text-sm font-mono text-foreground">Authorization: Bearer bp_YOUR_API_KEY</pre>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Base URL</span>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => copyCode(BASE_URL)}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
            </div>
            <pre className="text-sm font-mono text-foreground break-all">{BASE_URL}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        {Object.entries(endpoints).map(([category, eps]) => (
          <TabsContent key={category} value={category} className="space-y-4 mt-4">
            {eps.map((ep, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge className={`font-mono text-xs ${methodColors[ep.method]}`}>{ep.method}</Badge>
                    <code className="text-sm font-mono font-medium text-foreground">{ep.path}</code>
                  </div>
                  <p className="text-sm text-muted-foreground">{ep.description}</p>

                  {ep.params && ep.params.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Parameters</p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-secondary/50">
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Required</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ep.params.map(p => (
                              <tr key={p.name} className="border-t">
                                <td className="px-3 py-2 font-mono text-foreground">{p.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                                <td className="px-3 py-2">{p.required ? <Badge variant="destructive" className="text-[10px]">Required</Badge> : <span className="text-muted-foreground">Optional</span>}</td>
                                <td className="px-3 py-2 text-muted-foreground">{p.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {ep.body && ep.body.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Request Body (JSON)</p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-secondary/50">
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Field</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Required</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ep.body.map(b => (
                              <tr key={b.name} className="border-t">
                                <td className="px-3 py-2 font-mono text-foreground">{b.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{b.type}</td>
                                <td className="px-3 py-2">{b.required ? <Badge variant="destructive" className="text-[10px]">Required</Badge> : <span className="text-muted-foreground">Optional</span>}</td>
                                <td className="px-3 py-2 text-muted-foreground">{b.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Example</p>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => copyCode(ep.example)}>
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <pre className="bg-secondary/50 rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">{ep.example}</pre>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Response</p>
                    <pre className="bg-secondary/50 rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto">{ep.response}</pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Rate Limits */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Rate Limits</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="font-medium text-foreground">Starter</p>
              <p className="text-muted-foreground">60 requests/min</p>
            </div>
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="font-medium text-foreground">Professional</p>
              <p className="text-muted-foreground">300 requests/min</p>
            </div>
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="font-medium text-foreground">Agency / Enterprise</p>
              <p className="text-muted-foreground">1000 requests/min</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Codes */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Error Codes</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Code</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: "401", desc: "Invalid or missing API key" },
                { code: "403", desc: "Insufficient permissions" },
                { code: "404", desc: "Resource not found" },
                { code: "422", desc: "Validation error (check request body)" },
                { code: "429", desc: "Rate limit exceeded" },
                { code: "500", desc: "Internal server error" },
              ].map(e => (
                <tr key={e.code} className="border-t">
                  <td className="px-3 py-2 font-mono font-medium text-foreground">{e.code}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
