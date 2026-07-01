import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Loader2 } from "lucide-react";

interface AIAssistantButtonProps {
  contextType: "service_description" | "lead_note" | "deal_note" | "invoice_notes" | "general";
  onGenerate: (text: string) => void;
  placeholder?: string;
  size?: "sm" | "default" | "xs";
}

export function AIAssistantButton({
  contextType,
  onGenerate,
  placeholder = "Describe what you want to write...",
  size = "xs",
}: AIAssistantButtonProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState(false);

  const aiMutation = useMutation({
    mutationFn: async (textPrompt: string) => {
      const res = await apiRequest("POST", "/api/ai/generate", {
        prompt: textPrompt,
        contextType,
      });
      return res.json();
    },
    onSuccess: (data) => {
      onGenerate(data.text);
      setPrompt("");
      setOpen(false);
      toast({ title: "Content Generated!", description: "AI content has been written successfully." });
    },
    onError: (err: Error) => {
      toast({ 
        title: "AI Generation Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    aiMutation.mutate(prompt);
  };

  const getButtonClass = () => {
    if (size === "xs") return "h-7 px-2 text-[10px] font-bold";
    if (size === "sm") return "h-8 px-3 text-xs font-bold";
    return "h-9 px-4 text-sm font-bold";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`${getButtonClass()} border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary flex items-center gap-1.5 shrink-0 transition-all shadow-sm`}
        >
          <Sparkles className="w-3 h-3 text-primary animate-pulse" />
          <span>Write with AI</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 z-[99999]" align="end">
        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#EE2B2B] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              AI Assistant
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Gemini will generate professional content tailored to this area.
            </p>
          </div>
          <div className="space-y-1.5">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              required
              className="h-8 text-xs font-medium"
              disabled={aiMutation.isPending}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={aiMutation.isPending || !prompt.trim()}
            className="w-full h-8 font-bold bg-[#EE2B2B] hover:bg-[#c92222] text-white"
          >
            {aiMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Content"
            )}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
