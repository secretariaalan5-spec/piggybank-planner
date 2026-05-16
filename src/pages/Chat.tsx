import { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100);
      
      if (!error && data) {
        if (data.length === 0) {
          setMessages([{
            id: "welcome",
            role: "assistant",
            content: "Olá! Sou o Pigly, seu conselheiro financeiro de bolso. Oink! 🐷\n\nVocê pode me predir coisas como:\n• \"Comprei um lanche por 20\"\n• \"Recebi meu salário de 3000\"\n• \"Quanto gastei com Uber esse mês?\"\n\nComo posso ajudar hoje?",
            created_at: new Date().toISOString()
          }]);
        } else {
          setMessages(data);
        }
      }
      setInitialLoading(false);
    };
    fetchMessages();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;
    
    const text = input.trim();
    setInput("");
    
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);
    navigator.vibrate?.(10);

    try {
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "user",
        content: text,
      });

      // Chama a Edge Function do Oink Chat
      const { data, error } = await supabase.functions.invoke("oink-chat", {
        body: { message: text, user_id: user.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const tempAssistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, tempAssistantMsg]);
      setLoading(false);
      navigator.vibrate?.([10, 30, 10]);

    } catch (err: any) {
      toast.error("Erro ao enviar mensagem.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative h-full">
      {/* Header Fixo */}
      <div className="bg-background/90 backdrop-blur-2xl border-b border-border/60 sticky top-0 z-20 p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl shrink-0 relative overflow-hidden shadow-glow">
          <img src="/pigly-avatar.png" alt="Pigly" className="w-full h-full object-cover" />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22c55e] border-2 border-background rounded-full z-10"></span>
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-tight">Oink AI</h1>
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Online agora
          </p>
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-[90px]">
        {initialLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="h-8 w-8 rounded-full shrink-0 mr-2 mt-auto overflow-hidden shadow-glow">
                      <img src="/pigly-avatar.png" alt="Pigly" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                      isUser 
                        ? "bg-primary text-primary-foreground rounded-br-sm shadow-glow" 
                        : "glass rounded-bl-sm border border-border/60 text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                  
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="h-8 w-8 rounded-full shrink-0 mr-2 mt-auto overflow-hidden shadow-glow">
              <img src="/pigly-avatar.png" alt="Pigly" className="w-full h-full object-cover" />
            </div>
            <div className="glass rounded-2xl rounded-bl-sm p-4 flex items-center gap-1 w-16 h-10 border border-border/60">
              <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
              <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
              <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input de Mensagem */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-3xl border-t border-border/60 z-10">
        <div className="relative flex items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Fale com o Pigly..."
            className="rounded-full pr-12 bg-secondary/50 border-border/60 h-14 focus-visible:ring-primary/30 text-[15px]"
          />
          <Button 
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-1.5 h-11 w-11 rounded-full gradient-primary shadow-glow disabled:opacity-50"
          >
            <Send className="h-5 w-5 text-primary-foreground ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
