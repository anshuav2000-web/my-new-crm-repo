import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { log } from "./index";
import { Resend } from "resend";
import { WebSocketServer, WebSocket } from "ws";

// Resend integration - fetches credentials from Replit connector
async function getResendClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error("Resend integration not available");
  }

  const connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } }
  ).then((r) => r.json()).then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
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

      const emailHtml = `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff">
          <!-- Top yellow accent bar -->
          <tr><td style="height:6px;background:#EE2B2B"></td></tr>

          <!-- Header -->
          <tr><td style="padding:36px 40px 0">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="vertical-align:top">
                  <h1 style="margin:0;font-size:36px;font-weight:800;color:#222;letter-spacing:-1px">Invoice</h1>
                  <p style="margin:12px 0 0;font-size:16px;font-weight:700;color:#333">${companyName}</p>
                  ${companyAddress ? `<p style="margin:4px 0 0;font-size:13px;color:#777">${companyAddress}</p>` : ""}
                  ${companyEmail ? `<p style="margin:2px 0 0;font-size:13px;color:#777">${companyEmail}</p>` : ""}
                  ${companyPhone ? `<p style="margin:2px 0 0;font-size:13px;color:#777">${companyPhone}</p>` : ""}
                </td>
                <td style="vertical-align:top;text-align:right">
                  <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Invoice No.</p>
                  <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#EE2B2B">${invoice.invoiceNumber}</p>
                  <p style="margin:12px 0 0;font-size:13px;color:#999">Date: ${invoiceDate}</p>
                  ${dueDate ? `<p style="margin:2px 0 0;font-size:13px;color:#999">Due: ${dueDate}</p>` : ""}
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Divider -->
          <tr><td style="padding:20px 40px 0"><div style="border-top:2px solid #EE2B2B"></div></td></tr>

          <!-- Bill To -->
          <tr><td style="padding:20px 40px">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f9f9;border-radius:8px">
              <tr><td style="padding:20px">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600">Bill To</p>
                <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:#333">${invoice.clientName}</p>
                ${invoice.clientEmail ? `<p style="margin:4px 0 0;font-size:13px;color:#666">${invoice.clientEmail}</p>` : ""}
                ${invoice.clientPhone ? `<p style="margin:2px 0 0;font-size:13px;color:#666">${invoice.clientPhone}</p>` : ""}
                ${invoice.clientAddress ? `<p style="margin:2px 0 0;font-size:13px;color:#666">${invoice.clientAddress}</p>` : ""}
              </td></tr>
            </table>
          </td></tr>

          <!-- Items Table -->
          <tr><td style="padding:0 40px">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
              <thead>
                <tr>
                  <th style="padding:12px 16px;text-align:left;background:#EE2B2B;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Description</th>
                  <th style="padding:12px 16px;text-align:center;background:#EE2B2B;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Qty</th>
                  <th style="padding:12px 16px;text-align:right;background:#EE2B2B;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Rate</th>
                  <th style="padding:12px 16px;text-align:right;background:#EE2B2B;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Amount</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </td></tr>

          <!-- Totals -->
          <tr><td style="padding:20px 40px 0">
            <table cellpadding="0" cellspacing="0" border="0" width="280" align="right" style="border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#666">Subtotal</td>
                <td style="padding:6px 0;font-size:14px;color:#333;text-align:right;font-weight:500">${currencySymbol}${(invoice.subtotal || 0).toLocaleString("en-IN")}</td>
              </tr>
              ${discountAmount > 0 ? `<tr>
                <td style="padding:6px 0;font-size:14px;color:#22c55e">Discount${invoice.discountType === "percentage" ? ` (${invoice.discountValue}%)` : ""}</td>
                <td style="padding:6px 0;font-size:14px;color:#22c55e;text-align:right;font-weight:500">-${currencySymbol}${discountAmount.toLocaleString("en-IN")}</td>
              </tr>` : ""}
              ${taxAmount > 0 ? `<tr>
                <td style="padding:6px 0;font-size:14px;color:#666">Tax (${invoice.taxPercentage}%)</td>
                <td style="padding:6px 0;font-size:14px;color:#333;text-align:right;font-weight:500">${currencySymbol}${taxAmount.toLocaleString("en-IN")}</td>
              </tr>` : ""}
              <tr><td colspan="2" style="padding:0"><div style="border-top:2px solid #EE2B2B;margin:8px 0"></div></td></tr>
              <tr>
                <td style="padding:8px 0;font-size:18px;font-weight:800;color:#222">Total</td>
                <td style="padding:8px 0;font-size:18px;font-weight:800;color:#222;text-align:right">${currencySymbol}${(invoice.total || 0).toLocaleString("en-IN")}</td>
              </tr>
            </table>
          </td></tr>

          <!-- Spacer -->
          <tr><td style="height:20px"></td></tr>

          <!-- Notes -->
          ${invoice.notes ? `<tr><td style="padding:0 40px 20px">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600">Notes</p>
            <p style="margin:8px 0 0;font-size:13px;color:#666;line-height:1.6">${invoice.notes}</p>
          </td></tr>` : ""}

          <!-- Footer -->
          <tr><td style="padding:24px 40px;border-top:3px solid #EE2B2B;background:#fafafa;text-align:center">
            <p style="margin:0;font-size:14px;font-weight:700;color:#333">${companyName}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#999">Thank you for your business</p>
            ${companyEmail ? `<p style="margin:8px 0 0;font-size:12px;color:#999">${companyEmail}${companyPhone ? ` | ${companyPhone}` : ""}</p>` : ""}
          </td></tr>

          <!-- Bottom yellow accent bar -->
          <tr><td style="height:6px;background:#EE2B2B"></td></tr>
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
    const all = await storage.getServices();
    res.json(all);
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

  // ========== ACTIVITIES ==========
  app.get("/api/activities", async (_req, res) => {
    const acts = await storage.getActivities();
    res.json(acts);
  });

  return httpServer;
}
