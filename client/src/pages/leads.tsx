import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, MoreVertical, Pencil, Trash2, Phone, ChevronDown, X, Send, Upload } from "lucide-react";
import type { Lead } from "@shared/schema";

const statusOptions = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
const sourceOptions = ["manual", "website", "referral", "social_media", "n8n_webhook", "email"];
const callOutcomeOptions = [
  { value: "call_made", label: "Call Made" },
  { value: "picked_up", label: "Picked Up" },
  { value: "not_interested", label: "Not Interested" },
  { value: "interested", label: "Interested" },
  { value: "call_later", label: "Call After Sometime" },
  { value: "schedule_call", label: "Schedule a Call" },
  { value: "no_answer", label: "No Answer" },
];
const serviceOptions = [
  "Advertisement Design",
  "Social Media Marketing",
  "Website Development",
  "Video Production",
  "Photo Production",
  "Marketing Strategy",
  "n8n Automation",
  "AI Automation",
  "SEO Services",
  "Branding & Identity",
  "Email Marketing",
  "Content Writing",
];

function LeadForm({
  lead,
  onClose,
}: {
  lead?: Lead;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: lead?.name || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    company: lead?.company || "",
    category: lead?.category || "",
    city: lead?.city || "",
    country: lead?.country || "India",
    address: lead?.address || "",
    website: lead?.website || "",
    linkedin: lead?.linkedin || "",
    facebook: lead?.facebook || "",
    instagram: lead?.instagram || "",
    description: lead?.description || "",
    businessHours: lead?.businessHours || "",
    leadQualityScore: lead?.leadQualityScore || 0,
    qualityReasoning: lead?.qualityReasoning || "",
    socialSignals: lead?.socialSignals || "",
    growthSignals: lead?.growthSignals || "",
    interestedServices: lead?.interestedServices || [],
    source: lead?.source || "manual",
    status: lead?.status || "new",
    notes: lead?.notes || "",
    value: lead?.value || 0,
    assignedTo: lead?.assignedTo || "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Lead created successfully" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PATCH", `/api/leads/${lead!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Lead updated successfully" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lead) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Company Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company Name *</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Urban Threads Boutique"
              data-testid="input-lead-company"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Clothing Store"
              data-testid="input-lead-category"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Contact Person *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Full name"
              data-testid="input-lead-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+919876543210"
              data-testid="input-lead-phone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
              data-testid="input-lead-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessHours">Business Hours</Label>
            <Input
              id="businessHours"
              value={formData.businessHours}
              onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })}
              placeholder="11:00 AM - 8:00 PM, closed Mondays"
              data-testid="input-lead-businesshours"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="G-12, Lajpat Nagar II"
              data-testid="input-lead-address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="New Delhi"
              data-testid="input-lead-city"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="India"
              data-testid="input-lead-country"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Online Presence</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              data-testid="input-lead-website"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              placeholder="LinkedIn profile URL"
              data-testid="input-lead-linkedin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              value={formData.facebook}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              placeholder="Facebook page URL"
              data-testid="input-lead-facebook"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder="Instagram profile URL"
              data-testid="input-lead-instagram"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Lead Quality</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="leadQualityScore">Lead Quality Score (0-100)</Label>
            <Input
              id="leadQualityScore"
              type="number"
              min={0}
              max={100}
              value={formData.leadQualityScore}
              onChange={(e) => setFormData({ ...formData, leadQualityScore: parseInt(e.target.value) || 0 })}
              data-testid="input-lead-quality-score"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qualityReasoning">Quality Reasoning</Label>
            <Input
              id="qualityReasoning"
              value={formData.qualityReasoning}
              onChange={(e) => setFormData({ ...formData, qualityReasoning: e.target.value })}
              placeholder="Why this score?"
              data-testid="input-lead-quality-reasoning"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialSignals">Social Signals</Label>
            <Textarea
              id="socialSignals"
              value={formData.socialSignals}
              onChange={(e) => setFormData({ ...formData, socialSignals: e.target.value })}
              placeholder="Daily Instagram story updates, Facebook event posts..."
              data-testid="input-lead-social-signals"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="growthSignals">Growth Signals</Label>
            <Textarea
              id="growthSignals"
              value={formData.growthSignals}
              onChange={(e) => setFormData({ ...formData, growthSignals: e.target.value })}
              placeholder="500+ Instagram followers gained in 30 days..."
              data-testid="input-lead-growth-signals"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Interested Services</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {(formData.interestedServices as string[]).map((service) => (
            <Badge key={service} variant="secondary" className="gap-1 pr-1">
              {service}
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  interestedServices: (formData.interestedServices as string[]).filter((s) => s !== service),
                })}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between" data-testid="button-select-services">
              <span className="text-muted-foreground">
                {(formData.interestedServices as string[]).length > 0
                  ? `${(formData.interestedServices as string[]).length} service(s) selected`
                  : "Select services"}
              </span>
              <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-2" align="start">
            <div className="space-y-1 max-h-[250px] overflow-y-auto">
              {serviceOptions.map((service) => {
                const isChecked = (formData.interestedServices as string[]).includes(service);
                return (
                  <label
                    key={service}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            interestedServices: [...(formData.interestedServices as string[]), service],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            interestedServices: (formData.interestedServices as string[]).filter((s) => s !== service),
                          });
                        }
                      }}
                      data-testid={`checkbox-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    {service}
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">CRM Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={formData.source}
              onValueChange={(val) => setFormData({ ...formData, source: val })}
            >
              <SelectTrigger data-testid="select-lead-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(val) => setFormData({ ...formData, status: val })}
            >
              <SelectTrigger data-testid="select-lead-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Deal Value (₹)</Label>
            <Input
              id="value"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
              data-testid="input-lead-value"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Input
              id="assignedTo"
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              data-testid="input-lead-assigned"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          <AIAssistantButton
            contextType="service_description"
            onGenerate={(text) => setFormData({ ...formData, description: text })}
            placeholder={`e.g. Generate description for client request: ${formData.name}`}
          />
        </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="About the business..."
          data-testid="input-lead-description"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="notes">Notes</Label>
          <AIAssistantButton
            contextType="lead_note"
            onGenerate={(text) => setFormData({ ...formData, notes: text })}
            placeholder={`e.g. Write lead intake follow-up plan for: ${formData.name}`}
          />
        </div>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          data-testid="input-lead-notes"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-lead">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-save-lead">
          {isPending ? "Saving..." : lead ? "Update Lead" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | undefined>();
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookLeadId, setWebhookLeadId] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  
  // CSV Import States
  const [csvOpen, setCsvOpen] = useState(false);
  const [previewLeads, setPreviewLeads] = useState<any[]>([]);
  
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const importMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      for (const row of rows) {
        await apiRequest("POST", "/api/leads", row);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Import Successful", description: `Successfully imported ${previewLeads.length} leads from CSV!` });
      setCsvOpen(false);
      setPreviewLeads([]);
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
  });

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "Parse failed", description: "No valid lead rows with names were found in the CSV file.", variant: "destructive" });
        return;
      }
      setPreviewLeads(parsed);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (previewLeads.length === 0) return;
    importMutation.mutate(previewLeads);
  };

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      const row: any = {};
      headers.forEach((header, idx) => {
        if (values[idx] !== undefined) {
          row[header] = values[idx];
        }
      });

      if (row.name) {
        results.push({
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          company: row.company || null,
          value: parseInt(row.value) || 0,
          status: row.status || "new",
          category: row.category || null,
          source: row.source || "csv_import",
          notes: row.notes || null,
          tags: row.tags ? row.tags.split(";").map((t: string) => t.trim()) : [],
        });
      }
    }
    return results;
  }

  const sendToN8nMutation = useMutation({
    mutationFn: async ({ leadId, url }: { leadId: string; url: string }) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/send-to-n8n`, { url });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Lead sent to n8n webhook successfully" });
      setWebhookDialogOpen(false);
      setWebhookUrl("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead deleted" });
    },
  });

  const outcomeMutation = useMutation({
    mutationFn: async ({ id, callOutcome }: { id: string; callOutcome: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, { callOutcome });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const servicesMutation = useMutation({
    mutationFn: async ({ id, interestedServices }: { id: string; interestedServices: string[] }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, { interestedServices });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const filtered = leads?.filter((lead) => {
    const q = search.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(q) ||
      (lead.email?.toLowerCase().includes(q)) ||
      (lead.company?.toLowerCase().includes(q)) ||
      (lead.category?.toLowerCase().includes(q)) ||
      (lead.city?.toLowerCase().includes(q)) ||
      (lead.phone?.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingLead(undefined);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-leads-title">Leads</h1>
          <p className="text-muted-foreground">Manage your sales leads</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* CSV Import Button & Dialog */}
          <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
            <Button
              variant="outline"
              onClick={() => {
                setPreviewLeads([]);
                setCsvOpen(true);
              }}
              data-testid="button-import-csv"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Leads via CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 border rounded-lg bg-muted/20 text-xs space-y-1.5">
                  <p className="font-bold text-foreground">CSV File Formatting Guide:</p>
                  <p>Prepare your file with a header row matching the following column names exactly:</p>
                  <code className="block bg-background p-2 rounded font-mono text-[10px] overflow-x-auto border border-border/50">
                    Name, Email, Phone, Company, Value, Status, Category, Source, Notes, Tags
                  </code>
                  <p className="text-muted-foreground mt-1">
                    * Values should be integers. Multiple tags can be separated by a semicolon (e.g. <code>hot;digital</code>). Only rows containing a valid <strong>Name</strong> are processed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-file-input" className="text-xs font-semibold">Select CSV File</Label>
                  <Input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="cursor-pointer"
                  />
                </div>

                {previewLeads.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground">Import Preview ({previewLeads.length} leads detected):</p>
                    <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-muted border-b text-[10px] font-bold">
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Company</th>
                            <th className="p-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewLeads.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="border-b bg-background hover:bg-muted/10">
                              <td className="p-2 font-medium">{row.name}</td>
                              <td className="p-2 truncate">{row.email || "-"}</td>
                              <td className="p-2 truncate">{row.company || "-"}</td>
                              <td className="p-2">₹{row.value.toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {previewLeads.length > 5 && (
                        <p className="p-2 text-center text-[10px] text-muted-foreground bg-muted/20 border-t">
                          And {previewLeads.length - 5} more rows...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleConfirmImport}
                  className="w-full h-10 bg-[#EE2B2B] hover:bg-[#c92222] text-white"
                  disabled={importMutation.isPending || previewLeads.length === 0}
                >
                  {importMutation.isPending ? "Importing Leads..." : `Confirm & Import ${previewLeads.length} Leads`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => { setEditingLead(undefined); setDialogOpen(true); }}
                data-testid="button-add-lead"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
              </DialogHeader>
              <LeadForm lead={editingLead} onClose={handleClose} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-leads"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Company</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">City</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Outcome</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Services</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Score</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered && filtered.length > 0 ? (
                  filtered.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0" data-testid={`lead-item-${lead.id}`}>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{lead.company || lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.category || "-"}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{lead.phone}</p>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell text-sm">{lead.phone || "-"}</td>
                      <td className="p-4 hidden md:table-cell text-sm">{lead.email || "-"}</td>
                      <td className="p-4 hidden lg:table-cell text-sm">{lead.city || "-"}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            lead.status === "won" ? "default" :
                            lead.status === "lost" ? "destructive" :
                            "secondary"
                          }
                        >
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Select
                          value={lead.callOutcome || ""}
                          onValueChange={(val) => outcomeMutation.mutate({ id: lead.id, callOutcome: val })}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs" data-testid={`select-outcome-${lead.id}`}>
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                          <SelectContent>
                            {callOutcomeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-[180px] h-8 text-xs justify-between font-normal" data-testid={`button-services-${lead.id}`}>
                              <span className={`truncate ${lead.interestedServices && lead.interestedServices.length > 0 ? "" : "text-muted-foreground"}`}>
                                {lead.interestedServices && lead.interestedServices.length > 0
                                  ? lead.interestedServices.join(", ")
                                  : "Select services"}
                              </span>
                              <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[200px]" align="start">
                            {serviceOptions.map((service) => {
                              const current = lead.interestedServices || [];
                              const isChecked = current.includes(service);
                              return (
                                <DropdownMenuItem
                                  key={service}
                                  className="gap-2 cursor-pointer"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    const updated = isChecked
                                      ? current.filter((s) => s !== service)
                                      : [...current, service];
                                    servicesMutation.mutate({ id: lead.id, interestedServices: updated });
                                  }}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${isChecked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                                    {isChecked && <span className="text-primary-foreground text-[10px] leading-none">✓</span>}
                                  </div>
                                  {service}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        {lead.leadQualityScore ? (
                          <Badge variant={lead.leadQualityScore >= 70 ? "default" : lead.leadQualityScore >= 40 ? "secondary" : "outline"}>
                            {lead.leadQualityScore}
                          </Badge>
                        ) : "-"}
                      </td>
                      <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">
                        {lead.source?.replace(/_/g, " ")}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-lead-actions-${lead.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(lead)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setWebhookLeadId(lead.id);
                              setWebhookUrl("");
                              setWebhookDialogOpen(true);
                            }} data-testid={`button-send-n8n-${lead.id}`}>
                              <Send className="w-4 h-4 mr-2" />
                              Send to n8n
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(lead.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground">
                      No leads found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Lead to n8n Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL *</Label>
              <Input
                data-testid="input-webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-n8n-instance.com/webhook/..."
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Paste your external n8n webhook URL. The lead data will be sent as a JSON POST request.
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setWebhookDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                data-testid="button-confirm-send-n8n"
                disabled={!webhookUrl || sendToN8nMutation.isPending}
                onClick={() => sendToN8nMutation.mutate({ leadId: webhookLeadId, url: webhookUrl })}
              >
                {sendToN8nMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
