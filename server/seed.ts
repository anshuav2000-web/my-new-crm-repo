import { storage } from "./storage";
import { db } from "./db";
import { leads, contacts, deals, callLogs, tasks, activities, webhooks } from "@shared/schema";
import { log } from "./index";

export async function seedDatabase() {
  try {
    const existingLeads = await storage.getLeads();
    if (existingLeads.length > 0) {
      log("Database already has data, skipping seed", "seed");
      return;
    }

    log("Seeding database with sample data...", "seed");

    const leadData = [
      { name: "Rajesh Kumar", email: "rajesh@techstartup.in", phone: "+91 9876543210", company: "TechStartup India", source: "website", status: "new", value: 50000, notes: "Interested in website development and social media marketing" },
      { name: "Priya Sharma", email: "priya@fashionbrand.com", phone: "+91 9123456789", company: "Fashion Forward", source: "referral", status: "contacted", value: 75000, notes: "Looking for complete brand identity and advertisement design" },
      { name: "Amit Patel", email: "amit@foodchain.in", phone: "+91 8765432109", company: "Spice Route Restaurants", source: "social_media", status: "qualified", value: 120000, notes: "Multi-location restaurant chain needs full marketing strategy" },
      { name: "Sneha Reddy", email: "sneha@edtech.co", phone: "+91 7654321098", company: "EduBright", source: "email", status: "proposal", value: 200000, notes: "EdTech startup needs video production and marketing automation" },
      { name: "Vikram Singh", email: "vikram@realestate.in", phone: "+91 6543210987", company: "Skyline Properties", source: "manual", status: "negotiation", value: 350000, notes: "Real estate developer needs comprehensive digital marketing" },
    ];

    const createdLeads = [];
    for (const ld of leadData) {
      const created = await storage.createLead(ld);
      createdLeads.push(created);
    }

    const contactData = [
      { name: "Ananya Desai", email: "ananya@designstudio.com", phone: "+91 9988776655", company: "Design Studio", title: "Creative Director" },
      { name: "Karthik Menon", email: "karthik@mediahouse.in", phone: "+91 8877665544", company: "Media House", title: "Marketing Manager" },
      { name: "Neha Gupta", email: "neha@ecommerce.in", phone: "+91 7766554433", company: "ShopEase", title: "CEO" },
    ];

    for (const cd of contactData) {
      await storage.createContact(cd);
    }

    const dealData = [
      { title: "TechStartup Website Redesign", value: 50000, stage: "new_lead", probability: 20, expectedCloseDate: "2026-03-15", notes: "Initial consultation done" },
      { title: "Fashion Forward Brand Campaign", value: 75000, stage: "contacted", probability: 40, expectedCloseDate: "2026-03-20", notes: "Sent portfolio samples" },
      { title: "Spice Route Marketing Package", value: 120000, stage: "proposal", probability: 60, expectedCloseDate: "2026-04-01", notes: "Proposal sent and under review" },
      { title: "EduBright Video Series", value: 200000, stage: "negotiation", probability: 75, expectedCloseDate: "2026-04-15", notes: "Negotiating scope and timeline" },
      { title: "Skyline Digital Campaign", value: 350000, stage: "won", probability: 100, expectedCloseDate: "2026-02-28", notes: "Contract signed, project started" },
    ];

    for (const dd of dealData) {
      await storage.createDeal(dd);
    }

    const callLogData = [
      { leadId: createdLeads[0].id, calledBy: "Sales Team", outcome: "picked_up", duration: "10 min", notes: "Discussed website requirements" },
      { leadId: createdLeads[1].id, calledBy: "Account Manager", outcome: "interested", duration: "15 min", notes: "Very interested in ad design services" },
      { leadId: createdLeads[2].id, calledBy: "Sales Team", outcome: "schedule_call", duration: "5 min", notes: "Asked to call back next week", scheduledAt: "2026-03-01T10:00" },
      { leadId: createdLeads[3].id, calledBy: "Project Lead", outcome: "call_later", duration: "3 min", notes: "In a meeting, call after 4pm" },
      { leadId: createdLeads[4].id, calledBy: "Sales Team", outcome: "not_interested", duration: "2 min", notes: "Already has an agency" },
    ];

    for (const cld of callLogData) {
      await storage.createCallLog(cld);
    }

    const taskData = [
      { title: "Prepare proposal for Spice Route", description: "Create detailed marketing proposal with timeline and budget", status: "pending", priority: "high", assignedTo: "Design Team", dueDate: "2026-03-05" },
      { title: "Follow up with Fashion Forward", description: "Send portfolio and schedule meeting", status: "in_progress", priority: "medium", assignedTo: "Sales Team", dueDate: "2026-03-03" },
      { title: "Create social media content calendar", description: "Monthly content plan for March", status: "pending", priority: "medium", assignedTo: "Content Team", dueDate: "2026-03-01" },
      { title: "Review Skyline project deliverables", description: "Check first batch of creatives", status: "completed", priority: "high", assignedTo: "Creative Director", dueDate: "2026-02-25" },
    ];

    for (const td of taskData) {
      await storage.createTask(td);
    }

    const activityData = [
      { type: "lead_created", description: "New lead: Rajesh Kumar from TechStartup India", entityType: "lead", entityId: createdLeads[0].id },
      { type: "deal_created", description: "New deal: Skyline Digital Campaign (₹3,50,000)", entityType: "deal" },
      { type: "call_logged", description: "Call with Priya Sharma - Interested in services", entityType: "call_log" },
      { type: "task_completed", description: "Completed: Review Skyline project deliverables", entityType: "task" },
      { type: "lead_created_webhook", description: "Lead created via n8n automation", entityType: "lead" },
    ];

    for (const ad of activityData) {
      await storage.createActivity(ad);
    }

    await storage.createWebhook({ name: "n8n Lead Capture" });

    // Seed Premium Agency Services
    log("Seeding premium agency services...", "seed");
    const serviceData = [
      { name: "Website Development", description: "Full-stack high-converting web application with React & Node", rate: 50000 },
      { name: "Google Gemini AI Integration", description: "Custom AI automation workflows and assistant chatbot integration", rate: 75000 },
      { name: "Full Brand Identity", description: "Logo, guidelines, custom typography, and corporate asset kits", rate: 45000 },
      { name: "SEO & Content Marketing", description: "Comprehensive search engine optimization campaign and content scheduling", rate: 35000 },
      { name: "Social Media Strategy", description: "Monthly management, advertisement design, and engagement tracking", rate: 40000 },
    ];
    for (const s of serviceData) {
      await storage.createService(s);
    }

    log("Database seeded successfully!", "seed");
  } catch (err: any) {
    log(`Seed error: ${err.message}`, "seed");
  }
}
