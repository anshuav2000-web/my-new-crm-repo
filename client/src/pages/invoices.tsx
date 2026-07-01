import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AIAssistantButton } from "@/components/ai-assistant-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Send,
  FileText,
  X,
  Download,
} from "lucide-react";
import type { Invoice, InvoiceItem, Lead, Contact, Service } from "@shared/schema";

type InvoiceWithItems = Invoice & { items?: InvoiceItem[] };

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  partially_paid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

interface ItemRow {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

function InvoiceForm({
  invoice,
  onClose,
}: {
  invoice?: InvoiceWithItems;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: leads } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: contacts } = useQuery<Contact[]>({ queryKey: ["/api/contacts"] });
  const { data: servicesList = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });

  const [formData, setFormData] = useState({
    clientName: invoice?.clientName || "",
    clientEmail: invoice?.clientEmail || "",
    clientPhone: invoice?.clientPhone || "",
    clientAddress: invoice?.clientAddress || "",
    leadId: invoice?.leadId || "",
    contactId: invoice?.contactId || "",
    status: invoice?.status || "draft",
    discountType: invoice?.discountType || "percentage",
    discountValue: invoice?.discountValue || 0,
    taxPercentage: invoice?.taxPercentage ?? 18,
    notes: invoice?.notes || "",
    dueDate: invoice?.dueDate || "",
  });

  const [selectedServiceId, setSelectedServiceId] = useState("");

  const [items, setItems] = useState<ItemRow[]>(
    invoice?.items?.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      rate: i.rate,
      amount: i.amount,
    })) || [{ description: "", quantity: 1, rate: 0, amount: 0 }]
  );

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount =
    formData.discountType === "percentage"
      ? Math.round(subtotal * (formData.discountValue / 100))
      : formData.discountValue;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * (formData.taxPercentage / 100));
  const total = afterDiscount + taxAmount;

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const addService = (service: any) => {
    const newItem = {
      description: service.name + (service.description ? ` - ${service.description}` : ""),
      quantity: 1,
      rate: Number(service.rate) || 0,
      amount: Number(service.rate) || 0,
    };
    if (items.length === 1 && items[0].description === "" && items[0].rate === 0) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === "quantity" || field === "rate") {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const fillFromLead = (leadId: string) => {
    const lead = leads?.find((l) => l.id === leadId);
    if (lead) {
      setFormData((prev) => ({
        ...prev,
        leadId,
        clientName: lead.name,
        clientEmail: lead.email || prev.clientEmail,
        clientPhone: lead.phone || prev.clientPhone,
        clientAddress: lead.address || prev.clientAddress,
      }));
    }
  };

  const fillFromContact = (contactId: string) => {
    const contact = contacts?.find((c) => c.id === contactId);
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        contactId,
        clientName: contact.name,
        clientEmail: contact.email || prev.clientEmail,
        clientPhone: contact.phone || prev.clientPhone,
      }));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        subtotal,
        total,
        items: items.filter((i) => i.description),
      };
      if (invoice) {
        const res = await apiRequest("PATCH", `/api/invoices/${invoice.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/invoices", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: invoice ? "Invoice updated" : "Invoice created" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Import from Lead</Label>
          <Select value={formData.leadId} onValueChange={fillFromLead}>
            <SelectTrigger data-testid="select-lead">
              <SelectValue placeholder="Select lead..." />
            </SelectTrigger>
            <SelectContent>
              {leads?.map((lead) => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Import from Contact</Label>
          <Select value={formData.contactId} onValueChange={fillFromContact}>
            <SelectTrigger data-testid="select-contact">
              <SelectValue placeholder="Select contact..." />
            </SelectTrigger>
            <SelectContent>
              {contacts?.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Client Name *</Label>
          <Input
            data-testid="input-client-name"
            value={formData.clientName}
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
          />
        </div>
        <div>
          <Label>Client Email</Label>
          <Input
            data-testid="input-client-email"
            type="email"
            value={formData.clientEmail}
            onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
          />
        </div>
        <div>
          <Label>Client Phone</Label>
          <Input
            data-testid="input-client-phone"
            value={formData.clientPhone}
            onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
          />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input
            data-testid="input-due-date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Client Address</Label>
        <Textarea
          data-testid="input-client-address"
          value={formData.clientAddress}
          onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-base font-semibold">Services / Line Items</Label>
          <div className="flex gap-2 items-center">
            <Select
              value={selectedServiceId}
              onValueChange={(val) => {
                if (!val) return;
                const selected = servicesList.find((s) => s.id === val);
                if (selected) {
                  addService(selected);
                }
                setSelectedServiceId(""); // Reset selector immediately
              }}
            >
              <SelectTrigger className="w-48 h-9 text-xs border border-input bg-background" data-testid="button-add-service">
                <SelectValue placeholder="Add Service" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {servicesList
                  .filter((s) => s.isActive !== false)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} (₹{s.rate.toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item" className="h-9">
              <Plus className="w-3 h-3 mr-1" /> Custom Item
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                data-testid={`input-item-desc-${index}`}
                placeholder="Description"
                className="flex-1"
                value={item.description}
                onChange={(e) => updateItem(index, "description", e.target.value)}
              />
              <Input
                data-testid={`input-item-qty-${index}`}
                type="number"
                className="w-20"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
              />
              <Input
                data-testid={`input-item-rate-${index}`}
                type="number"
                className="w-28"
                placeholder="Rate"
                value={item.rate}
                onChange={(e) => updateItem(index, "rate", parseInt(e.target.value) || 0)}
              />
              <div className="w-28 flex items-center text-sm font-medium">
                ₹{item.amount.toLocaleString("en-IN")}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                data-testid={`button-remove-item-${index}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Discount Type</Label>
          <Select
            value={formData.discountType}
            onValueChange={(v) => setFormData({ ...formData, discountType: v })}
          >
            <SelectTrigger data-testid="select-discount-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Discount Value</Label>
          <Input
            data-testid="input-discount-value"
            type="number"
            value={formData.discountValue}
            onChange={(e) =>
              setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <Label>Tax %</Label>
          <Input
            data-testid="input-tax"
            type="number"
            value={formData.taxPercentage}
            onChange={(e) =>
              setFormData({ ...formData, taxPercentage: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>
              Discount ({formData.discountType === "percentage" ? `${formData.discountValue}%` : "Fixed"})
            </span>
            <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax ({formData.taxPercentage}%)</span>
            <span>₹{taxAmount.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base border-t pt-1">
          <span>Total</span>
          <span data-testid="text-invoice-total">₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label>Notes</Label>
          <AIAssistantButton
            contextType="invoice_notes"
            onGenerate={(text) => setFormData({ ...formData, notes: text })}
            placeholder={`e.g. Write a friendly billing note for: ${formData.clientName}`}
          />
        </div>
        <Textarea
          data-testid="input-notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !formData.clientName}
        className="w-full"
        data-testid="button-save-invoice"
      >
        {mutation.isPending ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
      </Button>
    </div>
  );
}

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithItems | undefined>();
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/invoices/${id}/send-email`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Invoice sent via email" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const inv = await res.json();
      const items = inv.items || [];

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({ title: "Pop-up blocked", description: "Please allow pop-ups to print/download your invoice.", variant: "destructive" });
        return;
      }

      const discountAmount = inv.discountValue
        ? (inv.discountType === "percentage"
          ? Math.round((inv.subtotal || 0) * (inv.discountValue / 100))
          : inv.discountValue)
        : 0;

      const taxAmount = inv.taxPercentage
        ? Math.round(((inv.subtotal || 0) - discountAmount) * (inv.taxPercentage / 100))
        : 0;

      const invoiceDate = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const dueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Immediate";

      const itemsHtml = items.map((item: any, idx: number) =>
        `<tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F4F6FB'}; height: 52px; font-size: 14px; border-bottom: 1px solid #E5E7EB;">
          <td style="padding:12px 16px; color:#4A4F5C;">${item.description}</td>
          <td style="padding:12px 16px; text-align:center; color:#4A4F5C;">${item.quantity}</td>
          <td style="padding:12px 16px; text-align:right; color:#4A4F5C;">Rs. ${item.rate.toLocaleString("en-IN")}</td>
          <td style="padding:12px 16px; text-align:right; color:#0A1628; font-weight:600;">Rs. ${item.amount.toLocaleString("en-IN")}</td>
        </tr>`
      ).join("");

      // Status pill configuration
      const isPaid = inv.status === "paid";
      const statusBg = isPaid ? "#2F9E44" : "#E53E3E";
      const statusLabel = isPaid ? "PAID" : "UNPAID";

      // Helper variables to prevent nested template string escaping issues
      const dueDateHtml = dueDate ? `<p style="margin:2px 0 0;font-size:13px;color:#999">Due: ${dueDate}</p>` : "";
      const clientEmailHtml = inv.clientEmail ? `<p style="margin:4px 0 0;font-size:13px;color:#666">${inv.clientEmail}</p>` : "";
      const clientPhoneHtml = inv.clientPhone ? `<p style="margin:2px 0 0;font-size:13px;color:#666">${inv.clientPhone}</p>` : "";
      const clientAddressHtml = inv.clientAddress ? `<p style="margin:2px 0 0;font-size:13px;color:#666">${inv.clientAddress}</p>` : "";
      
      const discountLabel = inv.discountType === "percentage" ? `${inv.discountValue}%` : "Fixed";
      const discountHtml = discountAmount > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#2F9E44">Discount (${discountLabel})</td>
          <td style="padding:6px 0;text-align:right;color:#2F9E44;font-weight:700;">-Rs. ${discountAmount.toLocaleString("en-IN")}</td>
        </tr>` : "";
      
      const taxHtml = taxAmount > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#8A8F9C">Tax / GST (${inv.taxPercentage}%)</td>
          <td style="padding:6px 0;text-align:right;color:#0A1628;font-weight:700;">Rs. ${taxAmount.toLocaleString("en-IN")}</td>
        </tr>` : "";

      const notesHtml = inv.notes ? `
        <div style="margin-top:30px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600">Notes</p>
          <p style="margin:8px 0 0;font-size:13px;color:#6B7280;font-style:italic;line-height:1.5">${inv.notes}</p>
        </div>` : "";

      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${inv.invoiceNumber}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
              @media print {
                body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; }
                .invoice-container { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
                .no-print { display: none; }
              }
              body { 
                font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; 
                color: #4A4F5C; 
                line-height: 1.5; 
                padding: 40px 0; 
                background: #F4F6FB; 
                margin: 0;
              }
              .invoice-container { 
                max-width: 840px; 
                margin: 0 auto; 
                background: #ffffff; 
                box-shadow: 0 10px 25px rgba(10, 22, 40, 0.05); 
                border-radius: 12px; 
                overflow: hidden; 
                box-sizing: border-box;
              }
              .header-band {
                background: #0A1628;
                padding: 50px 60px;
                color: #ffffff;
                box-sizing: border-box;
              }
              .content-area {
                padding: 0 60px 50px 60px;
                box-sizing: border-box;
              }
              .info-bar {
                background: #F4F6FB;
                margin: 30px 0;
                border-radius: 8px;
                padding: 20px 30px;
              }
              .section-label {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #8A8F9C;
                font-weight: 700;
                margin-bottom: 6px;
              }
              .section-value {
                font-size: 15px;
                color: #0A1628;
                font-weight: 700;
              }
              .pill-badge {
                display: inline-block;
                background: ${statusBg};
                color: #ffffff;
                font-size: 12px;
                font-weight: 800;
                padding: 6px 16px;
                border-radius: 14px;
                letter-spacing: 1px;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <!-- 1. Header Band -->
              <div class="header-band">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <img src="https://canvascartel.in/wp-content/uploads/2023/10/canvas-cartel-logo.png" alt="Canvas Cartel" style="height: 38px; width: auto; display: block;" onerror="this.src='https://placehold.co/180x40/0a1628/ffffff?text=Canvas+Cartel'"/>
                      <p style="margin: 8px 0 0 0; font-size: 13px; color: #B3B9C6; font-weight: 500; letter-spacing: 0.5px;">AI Automation & Digital Solutions</p>
                    </td>
                    <td style="vertical-align: middle; text-align: right;">
                      <h1 style="margin: 0; font-size: 38px; font-weight: 800; color: #ffffff; letter-spacing: -1.5px; text-transform: uppercase;">INVOICE</h1>
                      <p style="margin: 6px 0 0 0; font-size: 14px; color: #B3B9C6; font-weight: 600; letter-spacing: 1px;">NO: ${inv.invoiceNumber}</p>
                    </td>
                  </tr>
                </table>
              </div>

              <div class="content-area">
                <!-- 2. Info Bar -->
                <div class="info-bar">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="33.33%">
                        <div class="section-label">Issue Date</div>
                        <div class="section-value">${invoiceDate}</div>
                      </td>
                      <td width="33.33%" style="text-align: center; border-left: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB;">
                        <div class="section-label">Due Date</div>
                        <div class="section-value">${dueDate}</div>
                      </td>
                      <td width="33.33%" style="text-align: right; padding-right: 10px;">
                        <div class="section-label">Status</div>
                        <div class="pill-badge">${statusLabel}</div>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- 3. Bill To / From -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 40px;">
                  <tr>
                    <td width="50%" style="vertical-align: top; padding-right: 30px;">
                      <div class="section-label" style="margin-bottom: 10px;">Bill To</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0A1628; margin-bottom: 6px;">${inv.clientName}</div>
                      ${inv.clientEmail ? `<div style="font-size: 13px; color: #4A4F5C; margin-bottom: 4px;">${inv.clientEmail}</div>` : ""}
                      ${inv.clientPhone ? `<div style="font-size: 13px; color: #4A4F5C; margin-bottom: 4px;">${inv.clientPhone}</div>` : ""}
                      ${inv.clientAddress ? `<div style="font-size: 13px; color: #4A4F5C; line-height: 1.4;">${inv.clientAddress}</div>` : ""}
                    </td>
                    <td width="50%" style="vertical-align: top; padding-left: 30px; border-left: 1px solid #E5E7EB;">
                      <div class="section-label" style="margin-bottom: 10px;">From</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0A1628; margin-bottom: 6px;">Canvas Cartel</div>
                      <div style="font-size: 13px; color: #4A4F5C; margin-bottom: 4px;">hello@canvascartel.in</div>
                      <div style="font-size: 13px; color: #4A4F5C; margin-bottom: 4px;">+91 9876543210</div>
                      <div style="font-size: 13px; color: #4A4F5C; line-height: 1.4;">DLF Cyber City, Phase 3, Gurugram, HR, India</div>
                    </td>
                  </tr>
                </table>

                <!-- 4. Line Items Table -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-bottom: 40px;">
                  <thead>
                    <tr style="background: #F4F6FB; border-bottom: 2px solid #0A1628; height: 42px;">
                      <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #0A1628; text-transform: uppercase; letter-spacing: 1px;">Description</th>
                      <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 700; color: #0A1628; text-transform: uppercase; letter-spacing: 1px; width: 80px;">Qty</th>
                      <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 700; color: #0A1628; text-transform: uppercase; letter-spacing: 1px; width: 140px;">Rate</th>
                      <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 700; color: #0A1628; text-transform: uppercase; letter-spacing: 1px; width: 140px;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>

                <!-- 5. Totals -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 45px;">
                  <tr>
                    <td style="vertical-align: top;">
                      <!-- Subtotal & GST Details -->
                      <table cellpadding="0" cellspacing="0" border="0" width="260" style="font-size: 14px;">
                        <tr>
                          <td style="padding: 6px 0; color: #8A8F9C;">Subtotal</td>
                          <td style="padding: 6px 0; text-align: right; color: #0A1628; font-weight: 700;">Rs. ${(inv.subtotal || 0).toLocaleString("en-IN")}</td>
                        </tr>
                        ${discountHtml}
                        ${taxHtml}
                      </table>
                    </td>
                    <td style="vertical-align: top; text-align: right;">
                      <!-- Total Box -->
                      <div style="display: inline-block; background: #1E5EFF; color: #ffffff; padding: 20px 30px; border-radius: 8px; text-align: right; width: 320px; box-sizing: border-box; box-shadow: 0 4px 12px rgba(30, 94, 255, 0.15);">
                        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; opacity: 0.85; margin-bottom: 4px;">Total Amount Due</div>
                        <div style="font-size: 30px; font-weight: 800; letter-spacing: -0.5px;">Rs. ${(inv.total || 0).toLocaleString("en-IN")}</div>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- 6. Payment Terms -->
                <div style="margin-bottom: 35px;">
                  <h3 style="font-size: 15px; font-weight: 700; color: #0A1628; margin: 0 0 10px 0; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; text-transform: uppercase; letter-spacing: 0.5px;">Payment Terms</h3>
                  <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #4A4F5C; line-height: 1.6;">
                    <li>Payments are due within 15 days of the invoice date unless explicitly specified.</li>
                    <li>Please quote the Invoice Number as a reference with all transfers.</li>
                    <li>Payment via UPI / NetBanking / Bank Transfer is accepted.</li>
                    <li>Overdue accounts will be subject to a service charge of 1.5% per month.</li>
                    <li>Digital products or automated systems will only be fully released post final settlement.</li>
                    <li>GST invoices will be generated and issued upon request.</li>
                  </ol>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6" style="display: flex; gap: 30px; margin-bottom: 45px;">
                  <!-- 7. Notes -->
                  <div style="flex: 1;">
                    <h3 style="font-size: 15px; font-weight: 700; color: #0A1628; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Notes</h3>
                    <p style="margin: 0; font-size: 13px; color: #6B7280; font-style: italic; line-height: 1.5;">
                      ${inv.notes || "Thank you for choosing Canvas Cartel. We appreciate your business and look forward to supporting your AI automation requirements."}
                    </p>
                  </div>

                  <!-- 8. Payment Details Box -->
                  <div style="flex: 1; background: #F4F6FB; border-radius: 8px; padding: 20px; box-sizing: border-box;">
                    <h3 style="font-size: 13px; font-weight: 700; color: #0A1628; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Payment Details</h3>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 12px; line-height: 1.8;">
                      <tr>
                        <td style="color: #8A8F9C;">UPI ID:</td>
                        <td style="text-align: right; color: #0A1628; font-weight: 700;">9971193032@ptsbi</td>
                      </tr>
                      <tr>
                        <td style="color: #8A8F9C;">Account No:</td>
                        <td style="text-align: right; color: #0A1628; font-weight: 700;">5445178208</td>
                      </tr>
                      <tr>
                        <td style="color: #8A8F9C;">IFSC Code:</td>
                        <td style="text-align: right; color: #0A1628; font-weight: 700;">KKBK0004627</td>
                      </tr>
                      <tr>
                        <td style="color: #8A8F9C;">Bank Branch:</td>
                        <td style="text-align: right; color: #0A1628; font-weight: 700;">Kotak Bank, Delhi - Saket</td>
                      </tr>
                    </table>
                  </div>
                </div>

                <!-- 9. Footer Signatures -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 40px;">
                  <tr>
                    <td width="45%" style="text-align: center;">
                      <div style="border: 1px dashed #D1D5DB; padding: 25px; border-radius: 4px; height: 110px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-end;">
                        <div style="font-size: 12px; color: #9CA3AF; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Authorised Signature</div>
                      </div>
                    </td>
                    <td width="10%"></td>
                    <td width="45%" style="text-align: center;">
                      <div style="border: 1px dashed #D1D5DB; padding: 25px; border-radius: 4px; height: 110px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-end;">
                        <div style="font-size: 12px; color: #9CA3AF; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Company Seal / Stamp</div>
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #6B7280; font-weight: 500;">Canvas Cartel • DLF Cyber City, Gurugram • hello@canvascartel.in</p>
                  <p style="margin: 4px 0 0 0; font-size: 11px; color: #9CA3AF; font-style: italic;">This is a computer-generated invoice.</p>
                </div>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      toast({ title: "Failed to download", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = async (invoice: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      const full = await res.json();
      setEditingInvoice(full);
      setDialogOpen(true);
    } catch {
      setEditingInvoice(invoice as InvoiceWithItems);
      setDialogOpen(true);
    }
  };

  const filtered = invoices?.filter((inv) => {
    const matchSearch =
      inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
  const totalPaid = invoices?.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0) || 0;
  const totalPending = totalRevenue - totalPaid;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-invoices-title">Invoices</h1>
          <p className="text-muted-foreground">Manage invoices and billing</p>
        </div>
        <Button
          onClick={() => {
            setEditingInvoice(undefined);
            setDialogOpen(true);
          }}
          data-testid="button-create-invoice"
        >
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold" data-testid="text-total-revenue">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Amount Received</p>
            <p className="text-2xl font-bold text-green-600" data-testid="text-total-paid">
              ₹{totalPaid.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Amount</p>
            <p className="text-2xl font-bold text-orange-600" data-testid="text-total-pending">
              ₹{totalPending.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-invoices"
            placeholder="Search invoices..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No invoices found</p>
            <p className="text-muted-foreground">Create your first invoice to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered?.map((inv) => (
            <Card key={inv.id} data-testid={`card-invoice-${inv.id}`}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" data-testid={`text-invoice-number-${inv.id}`}>
                      {inv.invoiceNumber}
                    </span>
                    <Badge className={statusColors[inv.status] || ""}>
                      {inv.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {inv.clientName}
                    {inv.dueDate && ` • Due: ${inv.dueDate}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">₹{(inv.total || 0).toLocaleString("en-IN")}</p>
                    {(inv.amountPaid || 0) > 0 && (
                      <p className="text-xs text-green-600">
                        Paid: ₹{(inv.amountPaid || 0).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-invoice-menu-${inv.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(inv)} data-testid={`button-edit-invoice-${inv.id}`}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => sendEmailMutation.mutate(inv.id)}
                        disabled={!inv.clientEmail}
                        data-testid={`button-send-invoice-${inv.id}`}
                      >
                        <Send className="w-4 h-4 mr-2" /> Send via Email
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => downloadInvoice(inv.id)}
                        data-testid={`button-download-invoice-${inv.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" /> Download PDF / Print
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteMutation.mutate(inv.id)}
                        className="text-red-600"
                        data-testid={`button-delete-invoice-${inv.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingInvoice(undefined);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? `Edit Invoice ${editingInvoice.invoiceNumber}` : "Create Invoice"}
            </DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice}
            onClose={() => {
              setDialogOpen(false);
              setEditingInvoice(undefined);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
