import { useState } from "react";
import {
  usePhoneNumbers,
  useProvisionPhoneNumber,
  useImportTwilioNumber,
  useSearchTwilioNumbers,
  useBuyTwilioNumber,
  useAssignPhoneNumber,
  useSetDefaultPhoneNumber,
} from "@/hooks/use-phone-numbers";
import { useAgents } from "@/hooks/use-agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Loader2,
  MoreVertical,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Upload,
  UserPlus,
  UserX,
} from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

const spamColors: Record<string, { bg: string; label: string }> = {
  clean: { bg: "bg-success", label: "Clean" },
  "some-flags": { bg: "bg-warning", label: "Some Flags" },
  flagged: { bg: "bg-destructive", label: "Flagged" },
};

interface TwilioAvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality: string;
  region: string;
}

export default function PhoneNumbers() {
  const { toast } = useToast();
  const { data: phoneNumbers, isLoading } = usePhoneNumbers();
  const { data: agents } = useAgents();
  const provisionNumber = useProvisionPhoneNumber();
  const importTwilio = useImportTwilioNumber();
  const searchTwilio = useSearchTwilioNumbers();
  const buyTwilio = useBuyTwilioNumber();
  const assignNumber = useAssignPhoneNumber();
  const setDefault = useSetDefaultPhoneNumber();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // Free number form
  const [newType, setNewType] = useState<"local" | "toll_free">("local");
  const [areaCode, setAreaCode] = useState("720");

  // Twilio credentials
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioVerified, setTwilioVerified] = useState(false);
  const [twilioVerifying, setTwilioVerifying] = useState(false);
  const [twilioAccountName, setTwilioAccountName] = useState("");

  // Twilio import form
  const [importNumber, setImportNumber] = useState("");
  const [importFriendlyName, setImportFriendlyName] = useState("");

  // Twilio buy form
  const [buyAreaCode, setBuyAreaCode] = useState("720");
  const [buyType, setBuyType] = useState<"local" | "toll_free">("local");
  const [searchResults, setSearchResults] = useState<TwilioAvailableNumber[]>([]);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Phone Numbers</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const activeNumbers = phoneNumbers?.filter((pn) => pn.status === "active") || [];
  const totalCost = phoneNumbers?.reduce((sum, pn) => sum + (pn.monthly_cost || 0), 0) || 0;
  const activeAgents = agents?.filter((a) => a.status === "active") || [];

  const openAssignModal = (phoneId: string, currentAgentId: string | null) => {
    setSelectedPhoneId(phoneId);
    setSelectedAgentId(currentAgentId || "");
    setShowAssignModal(true);
  };

  const handleAssign = () => {
    if (!selectedPhoneId) return;
    assignNumber.mutate(
      { phoneId: selectedPhoneId, agentId: selectedAgentId || null },
      { onSuccess: () => setShowAssignModal(false) }
    );
  };

  const handleUnassign = (phoneId: string) => {
    assignNumber.mutate({ phoneId, agentId: null });
  };

  const handleVerifyTwilio = async () => {
    if (!twilioSid.startsWith("AC") || twilioSid.length < 34) {
      toast({ title: "Invalid Account SID", description: "Twilio Account SIDs start with 'AC' and are 34 characters long.", variant: "destructive" });
      return;
    }
    if (twilioToken.length < 32) {
      toast({ title: "Invalid Auth Token", description: "Twilio Auth Tokens are 32 characters long.", variant: "destructive" });
      return;
    }
    setTwilioVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-twilio-credentials", {
        body: { twilio_account_sid: twilioSid, twilio_auth_token: twilioToken },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Verification failed", description: data.error, variant: "destructive" });
        setTwilioVerified(false);
        return;
      }
      setTwilioVerified(true);
      setTwilioAccountName(data?.account_name || "");
      toast({ title: "Twilio credentials verified!", description: data?.account_name ? `Account: ${data.account_name}` : undefined });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
      setTwilioVerified(false);
    } finally {
      setTwilioVerifying(false);
    }
  };

  const validateTwilioCreds = (): boolean => {
    if (!twilioVerified) {
      toast({ title: "Please verify your Twilio credentials first", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateE164 = (num: string): boolean => {
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(num)) {
      toast({ title: "Invalid phone number", description: "Phone number must be in E.164 format (e.g. +15551234567).", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleImportTwilio = () => {
    if (!importNumber || !twilioSid || !twilioToken) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!validateTwilioCreds() || !validateE164(importNumber)) return;
    importTwilio.mutate(
      {
        phone_number: importNumber,
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
        friendly_name: importFriendlyName || undefined,
      },
      {
        onSuccess: () => {
          setShowNewModal(false);
          setImportNumber("");
          setImportFriendlyName("");
        },
      }
    );
  };

  const handleSearchTwilio = () => {
    if (!twilioSid || !twilioToken) {
      toast({ title: "Please enter your Twilio credentials", variant: "destructive" });
      return;
    }
    if (!validateTwilioCreds()) return;
    searchTwilio.mutate(
      {
        area_code: buyAreaCode,
        number_type: buyType,
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
      },
      {
        onSuccess: (data) => {
          setSearchResults(data?.numbers || []);
          if (!data?.numbers?.length) {
            toast({ title: "No numbers found for that area code", variant: "destructive" });
          }
        },
      }
    );
  };

  const handleBuyTwilio = (number: string) => {
    setBuyingNumber(number);
    buyTwilio.mutate(
      {
        phone_number: number,
        number_type: buyType,
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
      },
      {
        onSuccess: () => {
          setShowNewModal(false);
          setSearchResults([]);
          setBuyingNumber(null);
        },
        onSettled: () => setBuyingNumber(null),
      }
    );
  };

  const resetModal = () => {
    setShowNewModal(false);
    setSearchResults([]);
    setBuyingNumber(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Phone Numbers</h1>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Get New Number
        </Button>
      </div>

      {!phoneNumbers || phoneNumbers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-foreground mb-2">No phone numbers yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Provision a phone number to start making calls.
            </p>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Get Number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    {[
                      "Phone Number",
                      "Provider",
                      "Type",
                      "Status",
                      "Assigned Agent",
                      "Spam Score",
                      "STIR/SHAKEN",
                      "Cost",
                      "",
                    ].map((h) => (
                      <th key={h || "actions"} className="px-4 py-3 text-left section-label">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phoneNumbers.map((pn, i) => (
                    <tr
                      key={pn.id}
                      className={`border-t hover:bg-secondary/20 ${i % 2 ? "bg-secondary/10" : ""}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground font-mono">
                        <div className="flex items-center gap-1.5">
                          {pn.is_default && (
                            <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                          )}
                          {pn.phone_number}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            (pn as Record<string, unknown>).provider === "twilio"
                              ? "border-red-500/30 text-red-400"
                              : "border-primary/30 text-primary"
                          }`}
                        >
                          {((pn as Record<string, unknown>).provider as string) === "vapi" ? "platform" : ((pn as Record<string, unknown>).provider as string) || "platform"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {pn.number_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={`${statusColors[pn.status] || ""} border-0 text-[10px]`}
                        >
                          {pn.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {pn.agents ? (
                          <div>
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary border-0 text-[10px]"
                            >
                              {pn.agents.agent_name}
                            </Badge>
                            {(pn.agents as any).call_direction && (pn.agents as any).call_direction !== "outbound" && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">Answers inbound calls</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${spamColors[pn.spam_score || "clean"]?.bg || ""}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {spamColors[pn.spam_score || "clean"]?.label || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ShieldCheck
                            className={`h-3.5 w-3.5 ${
                              pn.stir_shaken_status === "full_attestation"
                                ? "text-success"
                                : pn.stir_shaken_status === "partial"
                                  ? "text-warning"
                                  : "text-muted-foreground"
                            }`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {pn.stir_shaken_status?.replace("_", " ") || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        ${pn.monthly_cost.toFixed(2)}/mo
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openAssignModal(pn.id, pn.assigned_agent_id)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign Agent
                            </DropdownMenuItem>
                            {pn.assigned_agent_id && (
                              <DropdownMenuItem onClick={() => handleUnassign(pn.id)}>
                                <UserX className="h-4 w-4 mr-2" />
                                Unassign Agent
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!pn.is_default && (
                              <DropdownMenuItem onClick={() => setDefault.mutate(pn.id)}>
                                <Star className="h-4 w-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="card-title">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className="text-2xl font-bold text-foreground">{activeNumbers.length}</p>
                  <p className="text-xs text-muted-foreground">Active Numbers</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className="text-2xl font-bold text-success">
                    {activeNumbers.filter((pn) => pn.cnam_registered).length}
                  </p>
                  <p className="text-xs text-muted-foreground">CNAM Registered</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 text-center">
                  <p className="text-2xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Monthly Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* New Number Modal */}
      <Dialog open={showNewModal} onOpenChange={resetModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Get New Number</DialogTitle>
            <DialogDescription>
              Add a phone number for outbound calls.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="twilio-import" className="mt-2">
            <TabsList className="w-full bg-secondary/50">
              <TabsTrigger value="twilio-import" className="flex-1">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import Twilio
              </TabsTrigger>
              <TabsTrigger value="twilio-buy" className="flex-1">
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Buy via Twilio
              </TabsTrigger>
              <TabsTrigger value="vapi-free" className="flex-1">
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Free Number
              </TabsTrigger>
            </TabsList>

            {/* Import Existing Twilio Number */}
            <TabsContent value="twilio-import" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
                Import an existing phone number from your Twilio account.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Twilio Account SID</Label>
                  <Input
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    placeholder="AC..."
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Auth Token</Label>
                  <Input
                    type="password"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Phone Number (E.164)</Label>
                <Input
                  value={importNumber}
                  onChange={(e) => setImportNumber(e.target.value)}
                  placeholder="+15551234567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Friendly Name (optional)</Label>
                <Input
                  value={importFriendlyName}
                  onChange={(e) => setImportFriendlyName(e.target.value)}
                  placeholder="e.g., Main Line"
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleImportTwilio}
                disabled={importTwilio.isPending}
              >
                {importTwilio.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Import Number
              </Button>
            </TabsContent>

            {/* Buy via Twilio */}
            <TabsContent value="twilio-buy" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
                Search and purchase a new number from Twilio. Your Twilio account will be charged.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Twilio Account SID</Label>
                  <Input
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    placeholder="AC..."
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Auth Token</Label>
                  <Input
                    type="password"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Area Code</Label>
                  <Input
                    value={buyAreaCode}
                    onChange={(e) => setBuyAreaCode(e.target.value)}
                    placeholder="720"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={buyType}
                    onValueChange={(v) => setBuyType(v as "local" | "toll_free")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="toll_free">Toll-Free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                variant="secondary"
                onClick={handleSearchTwilio}
                disabled={searchTwilio.isPending}
              >
                {searchTwilio.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Search className="h-4 w-4 mr-2" />
                Search Available Numbers
              </Button>

              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {searchResults.map((n) => (
                    <div
                      key={n.phone_number}
                      className="flex items-center justify-between px-3 py-2 hover:bg-secondary/20"
                    >
                      <div>
                        <span className="text-sm font-mono font-medium text-foreground">
                          {n.phone_number}
                        </span>
                        {n.locality && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {n.locality}, {n.region}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleBuyTwilio(n.phone_number)}
                        disabled={buyingNumber === n.phone_number}
                      >
                        {buyingNumber === n.phone_number ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Buy"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Free Number */}
            <TabsContent value="vapi-free" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-warning/10 text-xs text-warning">
                Free numbers are limited and shared. For production use, connect your own Twilio
                number.
              </div>
              <div>
                <Label className="text-xs">Choose type:</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {(["local", "toll_free"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        newType === t
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <p className="font-medium text-foreground capitalize">
                        {t.replace("_", "-")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t === "local" ? "$1.50/mo" : "$3.00/mo"}
                      </p>
                      {newType === t && <Check className="h-4 w-4 text-primary mx-auto mt-2" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Area Code</Label>
                <Input
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="e.g., 720"
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  provisionNumber.mutate(
                    { area_code: areaCode, number_type: newType },
                    { onSuccess: () => setShowNewModal(false) }
                  );
                }}
                disabled={provisionNumber.isPending}
              >
                {provisionNumber.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Provision Free Number
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Assign Agent Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Agent</DialogTitle>
            <DialogDescription>
              Choose an agent to handle calls from this number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {activeAgents.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No active agents available. Create an agent first.
                    </div>
                  ) : (
                    activeAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <span>{agent.agent_name}</span>
                          {agent.agent_title && (
                            <span className="text-muted-foreground text-xs">
                              · {agent.agent_title}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAssign}
                disabled={!selectedAgentId || assignNumber.isPending}
              >
                {assignNumber.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
