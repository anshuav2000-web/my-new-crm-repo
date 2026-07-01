import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  Phone,
  Kanban,
  CheckSquare,
  Settings,
  Webhook,
  UserPlus,
  FileText,
  CreditCard,
  Receipt,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import logoPath from "@assets/logo.png";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, key: "dashboard" },
  { title: "Leads", url: "/leads", icon: UserPlus, key: "leads" },
  { title: "Clients", url: "/contacts", icon: Users, key: "contacts" },
  { title: "Pipeline", url: "/pipeline", icon: Kanban, key: "deals" },
  { title: "Call Logs", url: "/call-logs", icon: Phone, key: "call-logs" },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, key: "tasks" },
  { title: "Invoices", url: "/invoices", icon: FileText, key: "invoices" },
  { title: "Payments", url: "/payments", icon: CreditCard, key: "payments" },
  { title: "Expenses", url: "/expenses", icon: Receipt, key: "expenses" },
];

const settingsItems = [
  { title: "Webhooks", url: "/webhooks", icon: Webhook, key: "webhooks" },
  { title: "Settings", url: "/settings", icon: Settings, key: "settings" },
];

function hasPermission(user: any, key: string) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (key === "dashboard") return true;

  const permissions = user.permissions || {};
  
  if (user.role === "manager") {
    return permissions[key] !== false;
  }
  
  if (user.role === "staff") {
    const staffDefaults: Record<string, boolean> = {
      leads: true,
      contacts: true,
      deals: true,
      "call-logs": true,
      tasks: true,
    };
    if (permissions[key] !== undefined) {
      return permissions[key] === true;
    }
    return !!staffDefaults[key];
  }

  return false;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const filteredMainItems = mainItems.filter((item) => hasPermission(user, item.key));
  const filteredSettingsItems = settingsItems.filter((item) => hasPermission(user, item.key));

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <img src={logoPath} alt="Canvas Cartel" className="h-8 w-auto" />
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Creative Agency CRM</p>
      </SidebarHeader>
      <SidebarContent>
        {filteredMainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {filteredSettingsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredSettingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          <p>canvascartel.in</p>
          <p className="mt-1 opacity-60">v1.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
