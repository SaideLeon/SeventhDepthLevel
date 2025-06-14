"use client";

import type { FormEvent } from "react";
import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal, Loader2, Trash2, Settings } from "lucide-react";
import ChatMessage from "@/components/chat-message";
import SettingsPopover from "@/components/settings-popover";
import { generateResponse, type GenerateResponseOutput } from "@/ai/flows/generate-response";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TYPING_SPEED_STORAGE_KEY = "typewriterai_typing_speed";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [typingSpeed, setTypingSpeed] = useState<number>(50); // Default speed in ms per character
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedSpeed = localStorage.getItem(TYPING_SPEED_STORAGE_KEY);
    if (storedSpeed) {
      setTypingSpeed(Number(storedSpeed));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TYPING_SPEED_STORAGE_KEY, typingSpeed.toString());
  }, [typingSpeed]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const aiResult: GenerateResponseOutput = await generateResponse({ prompt: userMessage.content });
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(), // Ensure unique ID
        role: "assistant",
        content: aiResult.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error generating AI response:", error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive",
      });
      // Optionally add the error message back to input or as a system message
      // setMessages((prev) => [...prev, {id: Date.now().toString(), role: 'assistant', content: "Sorry, I couldn't process that."}]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setTypingSpeed(newSpeed);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b flex justify-between items-center shadow-sm sticky top-0 bg-background z-10">
        <h1 className="text-2xl font-headline font-semibold text-primary">TypewriterAI</h1>
        <div className="flex items-center gap-2">
          <SettingsPopover currentSpeed={typingSpeed} onSpeedChange={handleSpeedChange}>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-5 w-5 text-muted-foreground hover:text-accent" />
            </Button>
          </SettingsPopover>
          <Button variant="ghost" size="icon" onClick={handleClearConversation} aria-label="Clear conversation">
            <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4" viewportRef={chatContainerRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} typingSpeed={typingSpeed} />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background sticky bottom-0">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 rounded-full px-4 py-2 focus-visible:ring-primary"
            aria-label="Message input"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon" className="rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted" aria-label="Send message">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
