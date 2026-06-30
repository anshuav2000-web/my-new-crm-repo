import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, UserPlus, LogIn } from "lucide-react";
import logoPath from "@assets/logo.png";

export default function AuthPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/login", data);
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({ title: "Welcome back!", description: `Logged in as ${user.fullName || user.username}` });
    },
    onError: (err: Error) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/register", data);
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({ title: "Account created successfully", description: `Logged in as ${user.fullName || user.username}` });
    },
    onError: (err: Error) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) return;
    loginMutation.mutate({ username: loginUsername, password: loginPassword });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword) return;
    registerMutation.mutate({
      username: regUsername,
      password: regPassword,
      fullName: regFullName,
      email: regEmail,
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Visual branding panel */}
      <div className="flex-1 bg-neutral-950 flex flex-col justify-between p-8 text-white relative overflow-hidden min-h-[300px] md:min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,43,43,0.15),transparent_45%)]" />
        <div className="relative z-10">
          <img src={logoPath} alt="Canvas Cartel" className="h-10 w-auto" />
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest">Creative Agency Network</p>
        </div>
        
        <div className="relative z-10 max-w-md my-auto pt-12 md:pt-0">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-white mb-6">
            Canvas <span className="text-[#EE2B2B]">Cartel</span> Connect.
          </h1>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed">
            The complete, high-performance agency CRM for managing creative leads, high-value pipelines, billing, automations, and live performance metrics.
          </p>
        </div>

        <div className="relative z-10 text-xs text-neutral-500">
          <p>© 2026 Canvas Cartel. All rights reserved.</p>
        </div>
      </div>

      {/* Auth forms panel */}
      <div className="w-full md:w-[480px] shrink-0 flex items-center justify-center p-6 bg-card border-l border-border/10">
        <div className="w-full max-w-sm space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="text-xs font-bold uppercase tracking-wider">
                <LogIn className="w-3.5 h-3.5 mr-2" />
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="text-xs font-bold uppercase tracking-wider">
                <UserPlus className="w-3.5 h-3.5 mr-2" />
                Join Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-none shadow-none p-0 bg-transparent">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xl font-bold">Sign In</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Enter your workspace credentials to access your dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-username">Username</Label>
                      <Input
                        id="login-username"
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="e.g. anshu"
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="h-10"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-10 mt-2 font-bold bg-[#EE2B2B] hover:bg-[#c92222] text-white"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-none shadow-none p-0 bg-transparent">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xl font-bold">Register Account</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Create a fresh profile to register yourself as an agency employee.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-fullname">Full Name</Label>
                      <Input
                        id="reg-fullname"
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Anshu"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email">Email Address</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. anshu@canvascartel.in"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-username">Username *</Label>
                      <Input
                        id="reg-username"
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. anshu"
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-password">Password *</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="h-10"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-10 mt-2 font-bold bg-[#EE2B2B] hover:bg-[#c92222] text-white"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
