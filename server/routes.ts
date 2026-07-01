import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { log } from "./index";
import { Resend } from "resend";
import { WebSocketServer, WebSocket } from "ws";
import { isAuthenticated } from "./auth";

// Resend integration - checks DB settings first, then environment keys, then Replit connectors
async function getResendClient() {
  try {
    const settingsArr = await storage.getSettings();
    const settingsMap: Record<string, string> = {};
    for (const s of settingsArr) {
      if (s.value !== null) settingsMap[s.key] = s.value;
    }

    if (settingsMap.resend_api_key) {
      return {
        client: new Resend(settingsMap.resend_api_key),
        fromEmail: settingsMap.company_email ? `Canvas Cartel <${settingsMap.company_email}>` : (process.env.RESEND_FROM_EMAIL || "Canvas Cartel <onboarding@resend.dev>"),
      };
    }
  } catch (err) {
    console.error("Failed to query settings from DB in getResendClient:", err);
  }

  if (process.env.RESEND_API_KEY) {
    return {
      client: new Resend(process.env.RESEND_API_KEY),
      fromEmail: process.env.RESEND_FROM_EMAIL || "Canvas Cartel <onboarding@resend.dev>",
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error("Resend API key is not configured. Please set it in system settings.");
  }

  const connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } }
  ).then((r) => r.json()).then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend integration not connected.");
  }
  return {
    client: new Resend(connectionSettings.settings.api_key),
    fromEmail: connectionSettings.settings.from_email || "Canvas Cartel <onboarding@resend.dev>",
  };
}

let broadcastFn: ((entity: string, action: string, data?: any) => void) | null = null;

export function broadcastEvent(entity: string, action: string, data?: any) {
  if (broadcastFn) {
    broadcastFn(entity, action, data);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Setup WebSocket Server for Real-Time Sync
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    log(`WebSocket client connected. Total clients: ${clients.size}`, "websocket");

    ws.on("close", () => {
      clients.delete(ws);
      log(`WebSocket client disconnected. Total clients: ${clients.size}`, "websocket");
    });

    ws.on("error", (err) => {
      log(`WebSocket client error: ${err.message}`, "websocket");
      clients.delete(ws);
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  function broadcast(entity: string, action: string, data?: any) {
    const message = JSON.stringify({ entity, action, data });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastFn = broadcast;

  // ========== LEADS ==========
  app.get("/api/leads", async (_req, res) => {
    const leads = await storage.getLeads();
    res.json(leads);
  });

  app.get("/api/leads/:id", async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const lead = await storage.createLead(req.body);
      await storage.createActivity({
        type: "lead_created",
        description: `New lead created: ${lead.name}`,
        entityType: "lead",
        entityId: lead.id,
      });
      broadcast("leads", "create", lead);
      broadcast("activities", "create");
      res.status(201).json(lead);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.updateLead(req.params.id, req.body);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      broadcast("leads", "update", lead);
      res.json(lead);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    await storage.deleteLead(req.params.id);
    broadcast("leads", "delete", { id: req.params.id });
    res.status(204).send();
  });

  // ========== CONTACTS ==========
  app.get("/api/contacts", async (_req, res) => {
    const contacts = await storage.getContacts();
    res.json(contacts);
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const contact = await storage.createContact(req.body);
      await storage.createActivity({
        type: "contact_created",
        description: `New contact added: ${contact.name}`,
        entityType: "contact",
        entityId: contact.id,
      });
      broadcast("contacts", "create", contact);
      broadcast("activities", "create");
      res.status(201).json(contact);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      if (!contact) return res.status(404).json({ message: "Contact not found" });
      broadcast("contacts", "update", contact);
      res.json(contact);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    await storage.deleteContact(req.params.id);
    broadcast("contacts", "delete", { id: req.params.id });
    res.status(204).send();
  });

  // ========== DEALS ==========
  app.get("/api/deals", async (_req, res) => {
    const deals = await storage.getDeals();
    res.json(deals);
  });

  app.post("/api/deals", async (req, res) => {
    try {
      const deal = await storage.createDeal(req.body);
      await storage.createActivity({
        type: "deal_created",
        description: `New deal created: ${deal.title} (₹${deal.value?.toLocaleString("en-IN") || 0})`,
        entityType: "deal",
        entityId: deal.id,
      });
      broadcast("deals", "create", deal);
      broadcast("activities", "create");
      res.status(201).json(deal);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/deals/:id", async (req, res) => {
    try {
      const deal = await storage.updateDeal(req.params.id, req.body);
      if (!deal) return res.status(404).json({ message: "Deal not found" });
      broadcast("deals", "update", deal);
      res.json(deal);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/deals/:id", async (req, res) => {
    await storage.deleteDeal(req.params.id);
    broadcast("deals", "delete", { id: req.params.id });
    res.status(204).send();
  });

  // ========== CALL LOGS ==========
  app.get("/api/call-logs", async (_req, res) => {
    const logs = await storage.getCallLogs();
    res.json(logs);
  });

  app.post("/api/call-logs", async (req, res) => {
    try {
      const cl = await storage.createCallLog(req.body);
      await storage.createActivity({
        type: "call_logged",
        description: `Call logged: ${cl.outcome} ${cl.calledBy ? `by ${cl.calledBy}` : ""}`,
        entityType: "call_log",
        entityId: cl.id,
      });
      broadcast("call-logs", "create", cl);
      broadcast("activities", "create");
      res.status(201).json(cl);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/call-logs/:id", async (req, res) => {
    try {
      const cl = await storage.updateCallLog(req.params.id, req.body);
      if (!cl) return res.status(404).json({ message: "Call log not found" });
      broadcast("call-logs", "update", cl);
      res.json(cl);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/call-logs/:id", async (req, res) => {
    await storage.deleteCallLog(req.params.id);
    broadcast("call-logs", "delete", { id: req.params.id });
    res.status(204).send();
  });

  // ========== TASKS ==========
  app.get("/api/tasks", async (_req, res) => {
    const allTasks = await storage.getTasks();
    res.json(allTasks);
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      broadcast("tasks", "create", task);
      res.status(201).json(task);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) return res.status(404).json({ message: "Task not found" });
      broadcast("tasks", "update", task);
      res.json(task);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    await storage.deleteTask(req.params.id);
    broadcast("tasks", "delete", { id: req.params.id });
    res.status(204).send();
  });

  // ========== WEBHOOKS ==========
  app.get("/api/webhooks", async (_req, res) => {
    const wh = await storage.getWebhooks();
    res.json(wh);
  });

  app.post("/api/webhooks", async (req, res) => {
    try {
      const wh = await storage.createWebhook(req.body);
      broadcast("webhooks", "create", wh);
      res.status(201).json(wh);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/webhooks/:id", async (req, res) => {
    try {
      const wh = await storage.updateWebhook(req.params.id, req.body);
      if (!wh) return res.status(404).json({ message: "Webhook not found" });
      broadcast("webhooks", "update", wh);
      res.json(wh);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/webhooks/:id", async (req, res) => {
    await storage.deleteWebhook(req.params.id);
    broadcast("webhooks", "delete", { id: req.params.id });
    res.status(204).send();
  });

  // ========== N8N WEBHOOK ENDPOINT ==========
  app.post("/api/webhook/n8n/:webhookId", async (req, res) => {
    try {
      const webhook = await storage.getWebhook(req.params.webhookId);
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }
      if (!webhook.isActive) {
        return res.status(403).json({ message: "Webhook is inactive" });
      }

      const body = req.body;

      if (!body.name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const lead = await storage.createLead({
        name: body.name,
        email: body.email || null,
        phone: body.phone || body.phoneNumber || null,
        company: body.company || body.companyName || null,
        category: body.category || null,
        city: body.city || null,
        country: body.country || null,
        address: body.address || null,
        website: body.website || null,
        linkedin: body.linkedin || null,
        facebook: body.facebook || null,
        instagram: body.instagram || null,
        description: body.description || null,
        businessHours: body.businessHours || null,
        leadQualityScore: body.leadQualityScore ? parseInt(body.leadQualityScore) : null,
        qualityReasoning: body.qualityReasoning || null,
        socialSignals: body.socialSignals || null,
        growthSignals: body.growthSignals || null,
        source: body.source || "n8n_webhook",
        status: "new",
        notes: body.notes || null,
        value: body.value ? parseInt(body.value) : 0,
        tags: body.tags || [],
        assignedTo: null,
      });

      await storage.createActivity({
        type: "lead_created_webhook",
        description: `Lead "${lead.name}" created via n8n webhook "${webhook.name}"`,
        entityType: "lead",
        entityId: lead.id,
      });

      broadcast("leads", "create", lead);
      broadcast("activities", "create");

      log(`n8n webhook received: Lead "${lead.name}" created via "${webhook.name}"`, "webhook");

      res.status(201).json({
        success: true,
        message: "Lead created successfully",
        lead,
      });
    } catch (err: any) {
      log(`n8n webhook error: ${err.message}`, "webhook");
      res.status(500).json({ message: err.message });
    }
  });

  // ========== SEND LEAD TO N8N WEBHOOK ==========
  app.post("/api/leads/:id/send-to-n8n", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "Webhook URL is required" });
      }

      if (!url.startsWith("https://") && !url.startsWith("http://")) {
        return res.status(400).json({ message: "Webhook URL must start with http:// or https://" });
      }

      const payload = {
        name: lead.name,
        companyName: lead.company,
        category: lead.category,
        phoneNumber: lead.phone,
        email: lead.email,
        city: lead.city,
        country: lead.country,
        address: lead.address,
        website: lead.website,
        linkedin: lead.linkedin,
        facebook: lead.facebook,
        instagram: lead.instagram,
        description: lead.description,
        businessHours: lead.businessHours,
        leadQualityScore: lead.leadQualityScore,
        qualityReasoning: lead.qualityReasoning,
        socialSignals: lead.socialSignals,
        growthSignals: lead.growthSignals,
        source: lead.source,
        status: lead.status,
        notes: lead.notes,
        interestedServices: lead.interestedServices,
        value: lead.value,
        callOutcome: lead.callOutcome,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        return res.status(502).json({ message: `Webhook returned ${response.status}: ${text}` });
      }

      await storage.createActivity({
        type: "lead_sent_webhook",
        description: `Lead "${lead.name}" sent to n8n webhook`,
        entityType: "lead",
        entityId: lead.id,
      });

      broadcast("activities", "create");

      log(`Lead "${lead.name}" sent to n8n webhook: ${url}`, "webhook");
      res.json({ success: true, message: "Lead sent to n8n webhook successfully" });
    } catch (err: any) {
      log(`Send to n8n error: ${err.message}`, "webhook");
      res.status(500).json({ message: err.message });
    }
  });

  // ========== INVOICES ==========
  app.get("/api/invoices", async (_req, res) => {
    const all = await storage.getInvoices();
    res.json(all);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    const items = await storage.getInvoiceItems(req.params.id);
    const invoicePayments = await storage.getPaymentsByInvoiceId(req.params.id);
    res.json({ ...invoice, items, payments: invoicePayments });
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const { items, ...invoiceData } = req.body;
      const count = (await storage.getInvoices()).length;
      const invoiceNumber = invoiceData.invoiceNumber || `INV-${String(count + 1).padStart(4, "0")}`;
      const invoice = await storage.createInvoice({ ...invoiceData, invoiceNumber });
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createInvoiceItem({ ...item, invoiceId: invoice.id });
        }
      }
      await storage.createActivity({
        type: "invoice_created",
        description: `Invoice ${invoiceNumber} created for ${invoice.clientName}`,
        entityType: "invoice",
        entityId: invoice.id,
      });
      const createdItems = await storage.getInvoiceItems(invoice.id);
      const fullInvoice = { ...invoice, items: createdItems };
      broadcast("invoices", "create", fullInvoice);
      broadcast("activities", "create");
      res.status(201).json(fullInvoice);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const { items, ...invoiceData } = req.body;
      const invoice = await storage.updateInvoice(req.params.id, invoiceData);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (items && Array.isArray(items)) {
        await storage.deleteInvoiceItemsByInvoiceId(req.params.id);
        for (const item of items) {
          await storage.createInvoiceItem({ ...item, invoiceId: invoice.id });
        }
      }
      const updatedItems = await storage.getInvoiceItems(invoice.id);
      const fullInvoice = { ...invoice, items: updatedItems };
      broadcast("invoices", "update", fullInvoice);
      res.json(fullInvoice);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    await storage.deleteInvoice(req.params.id);
    broadcast("invoices", "delete", { id: req.params.id });
    res.status(204).send();
  });

  app.post("/api/invoices/:id/send-email", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (!invoice.clientEmail) return res.status(400).json({ message: "Client email is required" });
      const items = await storage.getInvoiceItems(req.params.id);

      const settingsArr = await storage.getSettings();
      const settings: Record<string, string> = {};
      for (const s of settingsArr) { if (s.value) settings[s.key] = s.value; }
      const companyName = settings.company_name || "Canvas Cartel";
      const companyEmail = settings.company_email || "";
      const companyPhone = settings.company_phone || "";
      const companyAddress = settings.company_address || "";
      const currencySymbol = settings.currency_symbol || "₹";

      const itemsHtml = items.map((item, idx) =>
        `<tr style="background:${idx % 2 === 0 ? '#ffffff' : '#fafafa'}">
          <td style="padding:12px 16px;border-bottom:1px solid #eee;color:#333;font-size:14px">${item.description}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:center;color:#555;font-size:14px">${item.quantity}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;color:#555;font-size:14px">${currencySymbol}${item.rate.toLocaleString("en-IN")}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;color:#333;font-weight:600;font-size:14px">${currencySymbol}${item.amount.toLocaleString("en-IN")}</td>
        </tr>`
      ).join("");

      const discountAmount = invoice.discountValue
        ? (invoice.discountType === "percentage"
          ? Math.round((invoice.subtotal || 0) * (invoice.discountValue / 100))
          : invoice.discountValue)
        : 0;

      const taxAmount = invoice.taxPercentage
        ? Math.round(((invoice.subtotal || 0) - discountAmount) * (invoice.taxPercentage / 100))
        : 0;

      const invoiceDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

      // Premium, beautiful Navy & Gold style email template matching exact specs
      const isPaid = invoice.status === "paid";
      const statusBg = isPaid ? "#2F9E44" : "#E53E3E";
      const statusLabel = isPaid ? "PAID" : "UNPAID";

      const monthlyPlanBadgeHtml = invoice.isMonthlyPlan
        ? `<div style="display:inline-block;background:#1E5EFF;color:#ffffff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:12px;letter-spacing:0.5px;margin-top:4px;text-transform:uppercase">MONTHLY PLAN</div>`
        : "";

      const emailHtml = `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(10,22,40,0.05)">
          <!-- 1. Header Band -->
          <tr>
            <td style="background:#0A1628;padding:40px 40px;color:#ffffff">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle">
                    <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">Canvas Cartel</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#B3B9C6;letter-spacing:0.5px">AI Automation & Digital Solutions</p>
                  </td>
                  <td style="vertical-align:middle;text-align:right">
                    <h1 style="margin:0;font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-1px">INVOICE</h1>
                    <p style="margin:4px 0 0;font-size:13px;color:#B3B9C6;font-weight:600">NO: ${invoice.invoiceNumber}</p>
                    ${monthlyPlanBadgeHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Padding Area -->
          <tr>
            <td style="padding:30px 40px 40px 40px">
              
              <!-- 2. Info Bar -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F6FB;border-radius:8px;padding:20px 20px;margin-bottom:30px">
                <tr>
                  <td width="33.33%" style="vertical-align:top">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8A8F9C;font-weight:700;margin-bottom:4px">Issue Date</div>
                    <div style="font-size:14px;color:#0A1628;font-weight:700">${invoiceDate}</div>
                  </td>
                  <td width="33.33%" style="vertical-align:top;text-align:center;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8A8F9C;font-weight:700;margin-bottom:4px">Due Date</div>
                    <div style="font-size:14px;color:#0A1628;font-weight:700">${dueDate || "Immediate"}</div>
                  </td>
                  <td width="33.33%" style="vertical-align:top;text-align:right">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8A8F9C;font-weight:700;margin-bottom:4px">Status</div>
                    <span style="display:inline-block;background:${statusBg};color:#ffffff;font-size:11px;font-weight:800;padding:4px 12px;border-radius:14px;letter-spacing:0.5px">${statusLabel}</span>
                  </td>
                </tr>
              </table>

              <!-- 3. Bill To / From -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:30px">
                <tr>
                  <td width="50%" style="vertical-align:top;padding-right:20px">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8A8F9C;font-weight:700;margin-bottom:8px">Bill To</div>
                    <div style="font-size:15px;font-weight:700;color:#0A1628;margin-bottom:4px">${invoice.clientName}</div>
                    ${invoice.clientEmail ? `<div style="font-size:13px;color:#4A4F5C;margin-bottom:2px">${invoice.clientEmail}</div>` : ""}
                    ${invoice.clientPhone ? `<div style="font-size:13px;color:#4A4F5C;margin-bottom:2px">${invoice.clientPhone}</div>` : ""}
                    ${invoice.clientAddress ? `<div style="font-size:13px;color:#4A4F5C;line-height:1.4">${invoice.clientAddress}</div>` : ""}
                  </td>
                  <td width="50%" style="vertical-align:top;padding-left:20px;border-left:1px solid #E5E7EB">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8A8F9C;font-weight:700;margin-bottom:8px">From</div>
                    <div style="font-size:15px;font-weight:700;color:#0A1628;margin-bottom:4px">${companyName}</div>
                    <div style="font-size:13px;color:#4A4F5C;margin-bottom:2px">hello@canvascartel.in</div>
                    <div style="font-size:13px;color:#4A4F5C;margin-bottom:2px">+91 9876543210</div>
                    <div style="font-size:13px;color:#4A4F5C;line-height:1.4">DLF Cyber City, Gurugram, India</div>
                  </td>
                </tr>
              </table>

              <!-- 4. Line Items Table -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:30px">
                <thead>
                  <tr style="background:#F4F6FB;border-bottom:2px solid #0A1628;height:38px">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#0A1628;text-transform:uppercase;letter-spacing:0.5px">Description</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#0A1628;text-transform:uppercase;letter-spacing:0.5px;width:60px">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#0A1628;text-transform:uppercase;letter-spacing:0.5px;width:120px">Rate</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#0A1628;text-transform:uppercase;letter-spacing:0.5px;width:120px">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, idx) =>
                    `<tr style="background:${idx % 2 === 0 ? '#FFFFFF' : '#F4F6FB'};height:46px;font-size:13px;border-bottom:1px solid #E5E7EB">
                      <td style="padding:10px 12px;color:#4A4F5C">${item.description}</td>
                      <td style="padding:10px 12px;text-align:center;color:#4A4F5C">${item.quantity}</td>
                      <td style="padding:10px 12px;text-align:right;color:#4A4F5C">Rs. ${item.rate.toLocaleString("en-IN")}</td>
                      <td style="padding:10px 12px;text-align:right;color:#0A1628;font-weight:600">Rs. ${item.amount.toLocaleString("en-IN")}</td>
                    </tr>`
                  ).join("")}
                </tbody>
              </table>

              <!-- 5. Totals -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:30px">
                <tr>
                  <td style="vertical-align:top">
                    <!-- Subtotal Details -->
                    <table cellpadding="0" cellspacing="0" border="0" width="220" style="font-size:13px">
                      <tr>
                        <td style="padding:4px 0;color:#8A8F9C">Subtotal</td>
                        <td style="padding:4px 0;text-align:right;color:#0A1628;font-weight:700">Rs. ${(invoice.subtotal || 0).toLocaleString("en-IN")}</td>
                      </tr>
                      ${discountAmount > 0 ? `
                      <tr>
                        <td style="padding:4px 0;color:#2F9E44">Discount (${invoice.discountType === "percentage" ? `${invoice.discountValue}%` : "Fixed"})</td>
                        <td style="padding:4px 0;text-align:right;color:#2F9E44;font-weight:700">-Rs. ${discountAmount.toLocaleString("en-IN")}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding:4px 0;color:#8A8F9C">Tax / GST (${invoice.taxPercentage}%)</td>
                        <td style="padding:4px 0;text-align:right;color:#0A1628;font-weight:700">Rs. ${taxAmount.toLocaleString("en-IN")}</td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align:top;text-align:right">
                    <!-- Total Due Box -->
                    <div style="display:inline-block;background:#1E5EFF;color:#ffffff;padding:16px 24px;border-radius:8px;text-align:right;width:260px;box-sizing:border-box">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;opacity:0.85;margin-bottom:2px">Total Amount Due</div>
                      <div style="font-size:24px;font-weight:800">Rs. ${(invoice.total || 0).toLocaleString("en-IN")}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- 6. Payment Terms -->
              <div style="margin-bottom:25px;border-top:1px solid #E5E7EB;padding-top:15px">
                <h4 style="font-size:14px;font-weight:700;color:#0A1628;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px">Payment Terms</h4>
                <ol style="margin:0;padding-left:15px;font-size:12px;color:#4A4F5C;line-height:1.5">
                  <li>Payments are due within 15 days of the invoice date.</li>
                  <li>Reference the Invoice Number with all transfers.</li>
                  <li>Bank / UPI Transfer details are enclosed below.</li>
                </ol>
              </div>

              <!-- 8. Payment Details Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F6FB;border-radius:8px;padding:15px 20px;margin-bottom:25px">
                <tr>
                  <td>
                    <h4 style="font-size:12px;font-weight:700;color:#0A1628;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.5px">Payment Details</h4>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:12px;line-height:1.6">
                      <tr>
                        <td style="color:#8A8F9C">UPI ID:</td>
                        <td style="text-align:right;color:#0A1628;font-weight:700">9971193032@ptsbi</td>
                      </tr>
                      <tr>
                        <td style="color:#8A8F9C">Account No:</td>
                        <td style="text-align:right;color:#0A1628;font-weight:700">5445178208</td>
                      </tr>
                      <tr>
                        <td style="color:#8A8F9C">IFSC Code:</td>
                        <td style="text-align:right;color:#0A1628;font-weight:700">KKBK0004627</td>
                      </tr>
                      <tr>
                        <td style="color:#8A8F9C">Bank Branch:</td>
                        <td style="text-align:right;color:#0A1628;font-weight:700">Kotak Bank, Delhi - Saket</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 7. Notes -->
              <div style="margin-bottom:25px">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#8A8F9C;font-weight:700;margin-bottom:4px">Notes</div>
                <div style="font-size:12px;color:#6B7280;font-style:italic;line-height:1.5">
                  ${invoice.notes || "Thank you for choosing Canvas Cartel. We appreciate your business and look forward to supporting your AI automation requirements."}
                </div>
              </div>

              <!-- Footer Contact info -->
              <div style="border-top:1px solid #E5E7EB;padding-top:20px;margin-top:25px;text-align:center">
                <div style="margin-bottom:15px;font-size:11px;line-height:1.6;color:#8A8F9C;text-align:center;max-width:540px;margin-left:auto;margin-right:auto">
                  <strong style="color:#0A1628;text-transform:uppercase;letter-spacing:0.8px">What We Do & What We Serve:</strong><br/>
                  We specialize in high-impact Advertisement Design, Social Media Content, full-scale Website Development, Video & Photo Production, Growth Marketing Strategy, and robust n8n Workflow Automation. Built for peak performance.
                </div>
                <p style="margin:0;font-size:12px;color:#6B7280;font-weight:500">Canvas Cartel • hello@canvascartel.in</p>
                <p style="margin:4px 0 0 0;font-size:11px;color:#9CA3AF;font-style:italic">This is a computer-generated invoice.</p>
              </div>

            </td>
          </tr>
        </table>
      `;

      const { client: resend, fromEmail } = await getResendClient();
      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: [invoice.clientEmail],
        subject: `Invoice ${invoice.invoiceNumber} from Canvas Cartel`,
        html: emailHtml,
      });

      if (emailResult.error) {
        return res.status(500).json({ message: `Email failed: ${emailResult.error.message}` });
      }

      await storage.updateInvoice(req.params.id, { status: "sent", sentAt: new Date().toISOString() } as any);
      await storage.createActivity({
        type: "invoice_sent",
        description: `Invoice ${invoice.invoiceNumber} sent to ${invoice.clientEmail}`,
        entityType: "invoice",
        entityId: invoice.id,
      });

      res.json({ success: true, message: "Invoice sent successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ========== INVOICE ITEMS ==========
  app.post("/api/invoice-items", async (req, res) => {
    try {
      const item = await storage.createInvoiceItem(req.body);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    await storage.deleteInvoiceItem(req.params.id);
    res.status(204).send();
  });

  // ========== PAYMENTS ==========
  app.get("/api/payments", async (_req, res) => {
    const all = await storage.getPayments();
    res.json(all);
  });

  app.get("/api/payments/invoice/:invoiceId", async (req, res) => {
    const payments = await storage.getPaymentsByInvoiceId(req.params.invoiceId);
    res.json(payments);
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const payment = await storage.createPayment(req.body);
      const invoice = await storage.getInvoice(payment.invoiceId);
      if (invoice) {
        const allPayments = await storage.getPaymentsByInvoiceId(payment.invoiceId);
        const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus = totalPaid >= (invoice.total || 0) ? "paid" : "partially_paid";
        await storage.updateInvoice(payment.invoiceId, { amountPaid: totalPaid, status: newStatus } as any);
      }
      await storage.createActivity({
        type: "payment_received",
        description: `Payment of ₹${payment.amount.toLocaleString("en-IN")} received${invoice ? ` for invoice ${invoice.invoiceNumber}` : ""}`,
        entityType: "payment",
        entityId: payment.id,
      });
      broadcast("payments", "create", payment);
      broadcast("invoices", "update", { id: payment.invoiceId });
      broadcast("activities", "create");
      res.status(201).json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.updatePayment(req.params.id, req.body);
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      const invoice = await storage.getInvoice(payment.invoiceId);
      if (invoice) {
        const allPayments = await storage.getPaymentsByInvoiceId(payment.invoiceId);
        const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus = totalPaid >= (invoice.total || 0) ? "paid" : totalPaid > 0 ? "partially_paid" : invoice.status;
        await storage.updateInvoice(payment.invoiceId, { amountPaid: totalPaid, status: newStatus } as any);
      }
      broadcast("payments", "update", payment);
      broadcast("invoices", "update", { id: payment.invoiceId });
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    const payment = await storage.getPayment(req.params.id);
    await storage.deletePayment(req.params.id);
    if (payment) {
      const invoice = await storage.getInvoice(payment.invoiceId);
      if (invoice) {
        const allPayments = await storage.getPaymentsByInvoiceId(payment.invoiceId);
        const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus = totalPaid >= (invoice.total || 0) ? "paid" : totalPaid > 0 ? "partially_paid" : "sent";
        await storage.updateInvoice(payment.invoiceId, { amountPaid: totalPaid, status: newStatus } as any);
      }
      broadcast("payments", "delete", { id: req.params.id });
      broadcast("invoices", "update", { id: payment.invoiceId });
    }
    res.status(204).send();
  });

  // ========== EXPENSES ==========
  app.get("/api/expenses", async (_req, res) => {
    const all = await storage.getExpenses();
    res.json(all);
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expense = await storage.createExpense(req.body);
      await storage.createActivity({
        type: "expense_created",
        description: `Expense recorded: ${expense.title} - ₹${expense.amount.toLocaleString("en-IN")}`,
        entityType: "expense",
        entityId: expense.id,
      });
      broadcast("expenses", "create", expense);
      broadcast("activities", "create");
      res.status(201).json(expense);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.updateExpense(req.params.id, req.body);
      if (!expense) return res.status(404).json({ message: "Expense not found" });
      broadcast("expenses", "update", expense);
      res.json(expense);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    await storage.deleteExpense(req.params.id);
    broadcast("expenses", "delete", { id: req.params.id });
    res.status(204).send();
  });

  // ========== SERVICES ==========
  app.get("/api/services", async (_req, res) => {
    try {
      let all = await storage.getServices();
      if (all.length === 0) {
        log("[Self-Healing] Seeding default agency services on-the-fly...", "services");
        const serviceData = [
          { name: "Advertisement Design", description: "Eye-catching advertisements that communicate clearly and convert. We create visuals that stop the scroll and drive action.", rate: 15000 },
          { name: "Social Media Content", description: "Content that connects, not just posts. Strategic social media presence that builds community and engagement.", rate: 25000 },
          { name: "Website Development", description: "Websites that blend stunning design with peak performance. Fast, responsive, and built for results.", rate: 50000 },
          { name: "Video Production", description: "Compelling video content that tells your brand story. From concept to final cut, we bring visions to life.", rate: 45000 },
          { name: "Photo Production", description: "Professional photography that captures your brand essence. High-quality visuals that make an impact.", rate: 20000 },
          { name: "Marketing Strategy", description: "Complete marketing plans built around insight, creativity, and execution. Strategic roadmaps for growth.", rate: 35000 },
          { name: "n8n Automation", description: "Streamline your business with powerful workflow automation. Connect apps, automate tasks, and boost productivity.", rate: 30000 },
        ];
        for (const s of serviceData) {
          await storage.createService(s);
        }
        all = await storage.getServices();
      }
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const service = await storage.createService(req.body);
      broadcast("services", "create", service);
      res.status(201).json(service);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.updateService(req.params.id, req.body);
      if (!service) return res.status(404).json({ message: "Service not found" });
      broadcast("services", "update", service);
      res.json(service);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    await storage.deleteService(req.params.id);
    broadcast("services", "delete", { id: req.params.id });
    res.status(204).send();
  });

  // ========== SETTINGS ==========
  app.get("/api/settings", async (_req, res) => {
    const all = await storage.getSettings();
    const map: Record<string, string> = {};
    for (const s of all) {
      if (s.value !== null) map[s.key] = s.value;
    }
    res.json(map);
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const entries = req.body as Record<string, string>;
      for (const [key, value] of Object.entries(entries)) {
        await storage.upsertSetting(key, value);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ========== AI ASSISTANT CONTENT GENERATOR ==========
  app.post("/api/ai/generate", isAuthenticated, async (req, res) => {
    try {
      const { prompt, contextType } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required." });
      }

      // Check DB settings first for Gemini API Key
      const settingsArr = await storage.getSettings();
      const settingsMap: Record<string, string> = {};
      for (const s of settingsArr) {
        if (s.value !== null) settingsMap[s.key] = s.value;
      }

      const apiKey = settingsMap.gemini_api_key || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          message: "Gemini API Key is not configured. Please enter your API key under Settings > API Integrations tab." 
        });
      }

      // Build context instruction based on contextType
      let instruction = "";
      if (contextType === "service_description") {
        instruction = "You are a professional creative agency Copywriter. Generate a concise, beautiful, high-converting service description (2-3 sentences) explaining this service and why clients need it. Respond with only the direct description text, no intro, no outro, no markdown bolding unless necessary.";
      } else if (contextType === "lead_note") {
        instruction = "You are an experienced Sales Director. Analyze the following request/activity and generate a structured, strategic sales follow-up note or intake note for this lead (2 sentences max). Only respond with the note text.";
      } else if (contextType === "deal_note") {
        instruction = "Write a clear, strategic executive deal update note (2 sentences max) describing the value and project scope. Response should have no intro/outro.";
      } else if (contextType === "invoice_notes") {
        instruction = "Generate a short, friendly, professional thank-you note and terms disclaimer for an invoice (1-2 sentences).";
      } else {
        instruction = "You are a creative business assistant at Canvas Cartel agency. Generate professional, clear copy based on the request. Max 3 sentences, no filler.";
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${instruction}\n\nUser Request: ${prompt}`
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error Response:", errorText);
        return res.status(response.status).json({ message: "Failed to fetch response from Gemini. Please make sure your API key is valid." });
      }

      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      res.json({ text: generatedText });
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ========== ACTIVITIES ==========
  app.get("/api/activities", async (_req, res) => {
    const acts = await storage.getActivities();
    res.json(acts);
  });

  return httpServer;
}
