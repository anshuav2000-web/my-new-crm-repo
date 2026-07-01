import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings2,
  Image,
  Palette,
  Phone,
  ShoppingCart,
  Package,
  Share2,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Save,
  ExternalLink,
  IndianRupee,
  ShieldCheck,
  User,
  Lock,
  UserPlus,
  Cpu,
} from "lucide-react";
import type { Service } from "@shared/schema";
import logoPath from "@assets/logo.png";

const TABS = [
  { key: "profile", label: "My Profile", icon: User },
  { key: "general", label: "General", icon: Settings2 },
  { key: "integrations", label: "API Integrations", icon: Cpu },
  { key: "logo", label: "Logo", icon: Image },
  { key: "colors", label: "Colors", icon: Palette },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "order", label: "Order Settings", icon: ShoppingCart },
  { key: "services", label: "Services & Pricing", icon: Package },
  { key: "social", label: "Social", icon: Share2 },
  { key: "others", label: "Others", icon: MoreHorizontal },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: settingsMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const { data: servicesList = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const availableTabs = [
    ...TABS,
    ...(user?.role === "admin" ? [{ key: "employees", label: "Employees & Permissions", icon: ShieldCheck }] : [])
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">System Settings</h1>
        <p className="text-muted-foreground">Configure your CRM system preferences</p>
      </div>

      <div className="flex gap-6">
        <div className="w-48 shrink-0 space-y-1" data-testid="settings-tabs">
          {availableTabs.map((tab) => {
            // Non-admins can only see "My Profile" tab! Restrict settings to admins/managers.
            const isRestrictedSetting = ["general", "logo", "colors", "contact", "order", "services", "social", "others", "employees"].includes(tab.key);
            if (isRestrictedSetting && user?.role === "staff") return null;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`tab-${tab.key}`}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "general" && <GeneralTab settings={settingsMap} />}
          {activeTab === "integrations" && <IntegrationsTab settings={settingsMap} />}
          {activeTab === "logo" && <LogoTab />}
          {activeTab === "colors" && <ColorsTab settings={settingsMap} />}
          {activeTab === "contact" && <ContactTab settings={settingsMap} />}
          {activeTab === "order" && <OrderTab settings={settingsMap} />}
          {activeTab === "services" && <ServicesTab services={servicesList} />}
          {activeTab === "social" && <SocialTab settings={settingsMap} />}
          {activeTab === "others" && <OthersTab settings={settingsMap} />}
          {activeTab === "employees" && <EmployeesTab />}
        </div>
      </div>
    </div>
  );
}

function useSaveSettings() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: Record<string, string>) => {
      await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

function useSettingsForm(settings: Record<string, string>, keys: Record<string, string>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (Object.keys(settings).length > 0 && !initialized) {
      const init: Record<string, string> = {};
      for (const [field, settingKey] of Object.entries(keys)) {
        init[field] = settings[settingKey] ?? "";
      }
      setValues(init);
      setInitialized(true);
    }
  }, [settings, initialized]);

  const get = (field: string, fallback = "") => initialized ? (values[field] ?? fallback) : (settings[keys[field]] ?? fallback);
  const set = (field: string, value: string) => setValues((prev) => ({ ...prev, [field]: value }));
  const getSettingsPayload = () => {
    const payload: Record<string, string> = {};
    for (const [field, settingKey] of Object.entries(keys)) {
      payload[settingKey] = get(field);
    }
    return payload;
  };

  return { get, set, getSettingsPayload };
}

function GeneralTab({ settings }: { settings: Record<string, string> }) {
  const save = useSaveSettings();
  const form = useSettingsForm(settings, {
    companyName: "company_name",
    tagline: "company_tagline",
    website: "company_website",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">General Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Company Name*</Label>
            <Input
              data-testid="input-company-name"
              value={form.get("companyName", "Canvas Cartel")}
              onChange={(e) => form.set("companyName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              data-testid="input-company-tagline"
              value={form.get("tagline")}
              onChange={(e) => form.set("tagline", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Website URL</Label>
          <Input
            data-testid="input-company-website"
            value={form.get("website")}
            onChange={(e) => form.set("website", e.target.value)}
          />
        </div>
        <Button
          data-testid="button-save-general"
          onClick={() => save.mutate(form.getSettingsPayload())}
          disabled={save.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function LogoTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Logo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="border rounded-lg p-4 bg-muted/30">
            <img src={logoPath} alt="Canvas Cartel" className="h-16 w-auto" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Current Logo</p>
            <p className="text-sm text-muted-foreground">
              Your company logo appears in the sidebar, invoices, and emails.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          To update the logo, replace the logo file in the project assets.
        </p>
      </CardContent>
    </Card>
  );
}

function ColorsTab({ settings }: { settings: Record<string, string> }) {
  const save = useSaveSettings();
  const form = useSettingsForm(settings, { primaryColor: "primary_color" });
  const colorVal = form.get("primaryColor", "#EE2B2B");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Colors & Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Primary Brand Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorVal}
              onChange={(e) => form.set("primaryColor", e.target.value)}
              className="w-12 h-10 rounded border cursor-pointer"
              data-testid="input-primary-color"
            />
            <Input
              value={colorVal}
              onChange={(e) => form.set("primaryColor", e.target.value)}
              className="w-32"
              data-testid="input-primary-color-hex"
            />
            <div
              className="h-10 px-4 rounded flex items-center text-white text-sm font-medium"
              style={{ backgroundColor: colorVal }}
            >
              Preview
            </div>
          </div>
        </div>
        <Button
          data-testid="button-save-colors"
          onClick={() => save.mutate(form.getSettingsPayload())}
          disabled={save.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function ContactTab({ settings }: { settings: Record<string, string> }) {
  const save = useSaveSettings();
  const form = useSettingsForm(settings, {
    email: "company_email",
    phone: "company_phone",
    address: "company_address",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              data-testid="input-contact-email"
              value={form.get("email")}
              onChange={(e) => form.set("email", e.target.value)}
              placeholder="hello@canvascartel.in"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              data-testid="input-contact-phone"
              value={form.get("phone")}
              onChange={(e) => form.set("phone", e.target.value)}
              placeholder="+91 9876543210"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Business Address</Label>
          <Input
            data-testid="input-contact-address"
            value={form.get("address")}
            onChange={(e) => form.set("address", e.target.value)}
            placeholder="Full business address"
          />
        </div>
        <Button
          data-testid="button-save-contact"
          onClick={() => save.mutate(form.getSettingsPayload())}
          disabled={save.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function OrderTab({ settings }: { settings: Record<string, string> }) {
  const save = useSaveSettings();
  const form = useSettingsForm(settings, {
    currencyName: "currency_name",
    currencySymbol: "currency_symbol",
    enablePurchasing: "enable_purchasing",
    enableAutoInvoicing: "enable_auto_invoicing",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Currency Name (Must Be Uppercase)*</Label>
            <Input
              data-testid="input-currency-name"
              value={form.get("currencyName", "INR")}
              onChange={(e) => form.set("currencyName", e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency Symbol*</Label>
            <Input
              data-testid="input-currency-symbol"
              value={form.get("currencySymbol", "₹")}
              onChange={(e) => form.set("currencySymbol", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Enable Purchasing</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If enabled users or clients can place orders, make payments and can checkout from their dashboard by them self.
                  </p>
                </div>
                <Switch
                  data-testid="switch-purchasing"
                  checked={form.get("enablePurchasing") === "true"}
                  onCheckedChange={(v) => form.set("enablePurchasing", String(v))}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Enable Auto Invoicing</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If enabled when users or clients place an order an automatic Invoice, Project & Payment will be created for them.
                  </p>
                </div>
                <Switch
                  data-testid="switch-auto-invoicing"
                  checked={form.get("enableAutoInvoicing") === "true"}
                  onCheckedChange={(v) => form.set("enableAutoInvoicing", String(v))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Button
          data-testid="button-save-order"
          onClick={() => save.mutate(form.getSettingsPayload())}
          disabled={save.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function ServicesTab({ services }: { services: Service[] }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState("");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setRate("");
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setName(s.name);
    setDescription(s.description || "");
    setRate(String(s.rate));
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDialogOpen(false);
      toast({ title: "Service created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDialogOpen(false);
      toast({ title: "Service updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deleted" });
    },
  });

  const handleSave = () => {
    const data = {
      name,
      description,
      rate: parseInt(rate) || 0,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Services & Pricing</CardTitle>
          <Button onClick={openCreate} size="sm" data-testid="button-add-service">
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No services configured yet. Add your first service above.</p>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between gap-4 py-3 px-4 border rounded-lg"
                  data-testid={`service-row-${service.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{service.name}</p>
                      {service.isActive === false && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="font-mono">
                      <IndianRupee className="w-3 h-3 mr-0.5" />
                      {service.rate.toLocaleString("en-IN")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(service)}
                      data-testid={`button-edit-service-${service.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this service?")) {
                          deleteMutation.mutate(service.id);
                        }
                      }}
                      data-testid={`button-delete-service-${service.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name*</Label>
              <Input
                data-testid="input-service-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Development"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <AIAssistantButton
                  contextType="service_description"
                  onGenerate={(text) => setDescription(text)}
                  placeholder={`e.g. Describe service: ${name || 'Website Design'}`}
                />
              </div>
              <Input
                data-testid="input-service-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the service"
              />
            </div>
            <div className="space-y-2">
              <Label>Base Rate (₹)*</Label>
              <Input
                data-testid="input-service-rate"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
            <Button
              data-testid="button-save-service"
              onClick={handleSave}
              disabled={!name || !rate || createMutation.isPending || updateMutation.isPending}
              className="w-full"
            >
              {editing ? "Update Service" : "Create Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SocialTab({ settings }: { settings: Record<string, string> }) {
  const save = useSaveSettings();
  const form = useSettingsForm(settings, {
    facebook: "facebook_url",
    instagram: "instagram_url",
    linkedin: "linkedin_url",
    twitter: "twitter_url",
    youtube: "youtube_url",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Social Media Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Facebook</Label>
            <Input
              data-testid="input-facebook"
              value={form.get("facebook")}
              onChange={(e) => form.set("facebook", e.target.value)}
              placeholder="https://facebook.com/canvascartel"
            />
          </div>
          <div className="space-y-2">
            <Label>Instagram</Label>
            <Input
              data-testid="input-instagram"
              value={form.get("instagram")}
              onChange={(e) => form.set("instagram", e.target.value)}
              placeholder="https://instagram.com/canvascartel"
            />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input
              data-testid="input-linkedin"
              value={form.get("linkedin")}
              onChange={(e) => form.set("linkedin", e.target.value)}
              placeholder="https://linkedin.com/company/canvascartel"
            />
          </div>
          <div className="space-y-2">
            <Label>Twitter / X</Label>
            <Input
              data-testid="input-twitter"
              value={form.get("twitter")}
              onChange={(e) => form.set("twitter", e.target.value)}
              placeholder="https://twitter.com/canvascartel"
            />
          </div>
          <div className="space-y-2">
            <Label>YouTube</Label>
            <Input
              data-testid="input-youtube"
              value={form.get("youtube")}
              onChange={(e) => form.set("youtube", e.target.value)}
              placeholder="https://youtube.com/@canvascartel"
            />
          </div>
        </div>
        <Button
          data-testid="button-save-social"
          onClick={() => save.mutate(form.getSettingsPayload())}
          disabled={save.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function OthersTab({ settings }: { settings: Record<string, string> }) {
  const save = useSaveSettings();
  const form = useSettingsForm(settings, {
    defaultTax: "default_tax",
    invoicePrefix: "invoice_prefix",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Other Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Tax / GST (%)</Label>
            <Input
              data-testid="input-default-tax"
              type="number"
              value={form.get("defaultTax", "18")}
              onChange={(e) => form.set("defaultTax", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Applied automatically to new invoices</p>
          </div>
          <div className="space-y-2">
            <Label>Invoice Prefix</Label>
            <Input
              data-testid="input-invoice-prefix"
              value={form.get("invoicePrefix", "INV")}
              onChange={(e) => form.set("invoicePrefix", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">e.g. INV-0001, CC-0001</p>
          </div>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="font-medium text-sm">CRM Information</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-sm font-medium">1.0.0</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm font-medium">Canvas Cartel CRM</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Features</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {["Leads", "Contacts", "Pipeline", "Invoices", "Payments", "Expenses"].map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Integrations</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">n8n</Badge>
                  <Badge variant="secondary" className="text-xs">Resend</Badge>
                  <Badge variant="secondary" className="text-xs">Webhook API</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          data-testid="button-save-others"
          onClick={() => save.mutate(form.getSettingsPayload())}
          disabled={save.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function EmployeesTab() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [role, setRole] = useState("staff");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  // Employee creation state
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newDept, setNewDept] = useState("");
  const [newDesig, setNewDesig] = useState("");
  const [createdResult, setCreatedResult] = useState<any>(null);

  const { data: usersList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, role, permissions }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, { role, permissions });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDialogOpen(false);
      toast({ title: "Employee permissions updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/create-user", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCreatedResult(data);
      // Reset form fields
      setNewUsername("");
      setNewEmail("");
      setNewFullName("");
      setNewRole("staff");
      setNewDept("");
      setNewDesig("");
      toast({ title: "Employee account onboarded successfully!" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create employee", description: err.message, variant: "destructive" });
    }
  });

  const openEdit = (u: any) => {
    setEditingUser(u);
    setRole(u.role || "staff");
    const defaultPerms = {
      leads: true,
      contacts: true,
      pipeline: true,
      "call-logs": true,
      tasks: true,
      invoices: u.role !== "staff",
      payments: u.role !== "staff",
      expenses: u.role !== "staff",
      webhooks: u.role !== "staff",
      settings: u.role !== "staff",
    };
    setPermissions({ ...defaultPerms, ...(u.permissions || {}) });
    setDialogOpen(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: editingUser.id,
      role,
      permissions
    });
  };

  const handleCreateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEmployeeMutation.mutate({
      username: newUsername,
      email: newEmail,
      fullName: newFullName,
      role: newRole,
      department: newDept,
      designation: newDesig,
    });
  };

  const modules = [
    { key: "leads", name: "Leads & Client Intake" },
    { key: "contacts", name: "Client Directories" },
    { key: "pipeline", name: "Sales Pipeline & Deals (Kanban)" },
    { key: "call-logs", name: "Call Logs & Summaries" },
    { key: "tasks", name: "Tasks & Team Assignments" },
    { key: "invoices", name: "Invoices & Template Billing" },
    { key: "payments", name: "Payment Integrations" },
    { key: "expenses", name: "Agency Expenses & Outflows" },
    { key: "webhooks", name: "API Webhook Controls" },
    { key: "settings", name: "Global Settings & Pricing" },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading employees...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Employees & Permissions</CardTitle>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="bg-[#EE2B2B] hover:bg-[#c92222] text-white">
            <UserPlus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usersList.map((emp: any) => (
              <div key={emp.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {emp.fullName ? emp.fullName[0].toUpperCase() : emp.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {emp.fullName || emp.username}
                      </p>
                      <Badge variant={emp.role === "admin" ? "destructive" : emp.role === "manager" ? "default" : "secondary"}>
                        {emp.role ? emp.role.toUpperCase() : "STAFF"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{emp.email || `@${emp.username}`}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(emp)}>
                  Manage Access
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account Creation Modal Form */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard New Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEmployeeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-fullname">Full Name *</Label>
              <Input
                id="emp-fullname"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="e.g. Anshu"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-email">Email Address *</Label>
              <Input
                id="emp-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. anshu@canvascartel.in"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-username">Username *</Label>
              <Input
                id="emp-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. anshu"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emp-dept">Department</Label>
                <Input
                  id="emp-dept"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="e.g. Design"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-desig">Designation</Label>
                <Input
                  id="emp-desig"
                  value={newDesig}
                  onChange={(e) => setNewDesig(e.target.value)}
                  placeholder="e.g. Creative Lead"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-role">CRM Access Role</Label>
              <select
                id="emp-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="staff">Staff (Restricted Access)</option>
                <option value="manager">Manager (Standard Access)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>

            <p className="text-[10px] text-muted-foreground italic">
              * The system will automatically generate a secure temporary password and dispatch a welcome email with the login credentials to their inbox.
            </p>

            <Button type="submit" className="w-full h-10 bg-[#EE2B2B] hover:bg-[#c92222]" disabled={createEmployeeMutation.isPending}>
              {createEmployeeMutation.isPending ? "Creating Account..." : "Onboard Employee"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Creation Success Dialog */}
      <Dialog open={!!createdResult} onOpenChange={() => setCreatedResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Created Successfully!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">The employee profile has been created successfully inside the CRM directory.</p>
            
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3 font-mono text-sm">
              <div>👤 <strong>Username:</strong> {createdResult?.user?.username}</div>
              <div>🔑 <strong>Temporary Password:</strong> {createdResult?.tempPassword}</div>
              <div>📧 <strong>Onboarding Email Status:</strong> {createdResult?.emailSent ? "✅ Welcomed via Email" : "⚠️ Offline (Pass given above)"}</div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Please copy these details and send them manually if the onboarding mail is offline. The employee must change their password on first sign-in.
            </p>

            <Button onClick={() => setCreatedResult(null)} className="w-full">
              Dismiss & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Access Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">User details</p>
              <div className="p-3 border rounded-lg bg-muted/30">
                <p className="text-sm font-medium">{editingUser?.firstName ? `${editingUser.firstName} ${editingUser.lastName || ""}` : editingUser?.email}</p>
                <p className="text-xs text-muted-foreground">{editingUser?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>CRM Access Role</Label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setRole(newRole);
                  if (newRole === "admin") {
                    const allPerms: any = {};
                    modules.forEach(m => {
                      allPerms[m.key] = true;
                    });
                    setPermissions(allPerms);
                  }
                }}
                className="w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="staff">Staff (Restricted Access)</option>
                <option value="manager">Manager (Standard Access)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>

            {role !== "admin" && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Authorized Modules</Label>
                <p className="text-xs text-muted-foreground mb-3">Deselect the modules this employee should not see</p>
                <div className="space-y-2 border rounded-lg p-3 max-h-60 overflow-y-auto">
                  {modules.map((m) => {
                    const mKey = m.key;
                    return (
                      <div key={m.key} className="flex items-center justify-between">
                        <Label htmlFor={`perm-${m.key}`} className="text-sm font-normal leading-none cursor-pointer flex-1 py-1">
                          {m.name}
                        </Label>
                        <Switch
                          id={`perm-${m.key}`}
                          checked={permissions[mKey] !== false}
                          onCheckedChange={(checked) => setPermissions(p => ({ ...p, [mKey]: checked }))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button onClick={handleSave} className="w-full mt-4" disabled={updateMutation.isPending}>
              Apply & Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [skills, setSkills] = useState(user?.skills || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/auth/user"], updated);
      toast({ title: "Profile updated successfully!" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed successfully!" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ fullName, email, phone, department, designation, bio, skills });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please make sure your new passwords are identical.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Profile Details form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prof-username">Username</Label>
                    <Input id="prof-username" value={user?.username} disabled className="bg-muted opacity-80" />
                    <p className="text-[10px] text-muted-foreground">Username cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-role">Account Role</Label>
                    <Input id="prof-role" value={user?.role?.toUpperCase()} disabled className="bg-muted opacity-80" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prof-fullname">Full Name</Label>
                    <Input id="prof-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="anshu" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-email">Email Address</Label>
                    <Input id="prof-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anshu@canvascartel.in" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prof-phone">Phone Number</Label>
                    <Input id="prof-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-dept">Department</Label>
                    <Input id="prof-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Design / Dev" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prof-desig">Designation</Label>
                    <Input id="prof-desig" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Lead Developer" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prof-skills">Skills & Expertise</Label>
                  <Input id="prof-skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. React, Node.js, Branding (comma separated)" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prof-bio">Bio / Professional Summary</Label>
                  <textarea id="prof-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short summary about yourself..." className="w-full min-h-24 px-3 py-2 border rounded-md text-sm bg-background" />
                </div>

                <Button type="submit" disabled={updateProfileMutation.isPending} className="bg-[#EE2B2B] hover:bg-[#c92222] text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Update Profile Details
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Change Password & Details Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#EE2B2B]" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pass-current">Current Password</Label>
                  <Input id="pass-current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pass-new">New Password</Label>
                  <Input id="pass-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pass-confirm">Confirm New Password</Label>
                  <Input id="pass-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" disabled={changePasswordMutation.isPending} className="w-full">
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-muted/10 border-dashed">
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-sm">Professional Summary</p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>💼 <span className="font-medium text-foreground">Joined At:</span> {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                <p>📍 <span className="font-medium text-foreground">Department:</span> {user?.department || "Unassigned"}</p>
                <p>🎖️ <span className="font-medium text-foreground">Role:</span> {user?.role?.toUpperCase()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab({ settings }: { settings: Record<string, string> }) {
  const save = useSaveSettings();
  const [geminiKey, setGeminiKey] = useState(settings.gemini_api_key || "");
  const [resendKey, setResendKey] = useState(settings.resend_api_key || "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({
      gemini_api_key: geminiKey,
      resend_api_key: resendKey,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#EE2B2B]" />
          External API Integrations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <p className="text-xs text-muted-foreground">
            Configure external API connections securely. These settings are saved in the production database and override environment variables automatically.
          </p>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm text-[#EE2B2B]">✨ Google Gemini AI</span>
              <Badge variant="outline" className="text-[10px]">Content Generation</Badge>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gemini-key">Gemini API Key</Label>
              <Input
                id="gemini-key"
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="font-mono h-10"
              />
              <p className="text-[10px] text-muted-foreground">
                Required to generate high-converting service descriptions and lead intake notes. Get yours from Google AI Studio.
              </p>
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm text-[#EE2B2B]">📧 Resend Email Delivery</span>
              <Badge variant="outline" className="text-[10px]">Invoices & Welcomes</Badge>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resend-key">Resend API Key</Label>
              <Input
                id="resend-key"
                type="password"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                placeholder="re_..."
                className="font-mono h-10"
              />
              <p className="text-[10px] text-muted-foreground">
                Required to dispatch invoices and onboarding credentials to employee emails. Get yours from Resend Dashboard.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={save.isPending} className="bg-[#EE2B2B] hover:bg-[#c92222] text-white">
            <Save className="w-4 h-4 mr-2" />
            {save.isPending ? "Saving Keys..." : "Apply & Save API Keys"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
