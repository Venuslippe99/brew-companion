import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { mockBatches } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Send, AlertTriangle, FlaskConical, X } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const quickPrompts = [
  "Is this normal?",
  "What should I do next?",
  "Is it time for F2?",
  "When should I refrigerate?",
  "What are signs I should discard?",
];

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your kombucha brewing assistant. Ask me anything about your batches, fermentation stages, flavouring, or troubleshooting. You can also select a specific batch for context-aware guidance.",
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [showBatchSelect, setShowBatchSelect] = useState(false);

  const activeBatches = mockBatches.filter((b) => b.status === "active");
  const selected = activeBatches.find((b) => b.id === selectedBatch);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulated response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "This is a demo response. When connected to Lovable Cloud, I'll have full context about your batches, fermentation history, and can provide personalized guidance based on your brewing data.",
        },
      ]);
    }, 800);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
        {/* Header */}
        <div className="px-4 pt-6 lg:pt-10 lg:px-8 pb-3 space-y-3">
          <ScrollReveal>
            <h1 className="font-display text-2xl font-semibold text-foreground">Assistant</h1>
          </ScrollReveal>

          {/* Batch selector */}
          <div className="flex items-center gap-2">
            {selected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-honey-light border border-primary/15 rounded-full text-sm">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{selected.name}</span>
                <button onClick={() => setSelectedBatch(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBatchSelect(!showBatchSelect)}
                className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                + Select a batch for context
              </button>
            )}
          </div>

          {showBatchSelect && !selectedBatch && (
            <div className="bg-card border border-border rounded-xl p-2 space-y-1 animate-scale-in">
              {activeBatches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBatch(b.id); setShowBatchSelect(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* Safety disclaimer */}
          <div className="flex items-start gap-2 px-3 py-2 bg-caution-bg border border-caution/15 rounded-lg">
            <AlertTriangle className="h-3.5 w-3.5 text-caution mt-0.5 shrink-0" />
            <p className="text-[11px] text-caution-foreground leading-relaxed">
              This guidance is informational. Use caution and discard if you observe signs of contamination or dangerous pressure.
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 space-y-4 pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-foreground rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 lg:px-8 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-4 lg:px-8 pb-4 pt-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about your brew..."
              className="flex-1 h-11 px-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim()}
              className="h-11 w-11 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
