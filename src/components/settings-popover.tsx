
"use client";

import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Added Switch

interface SettingsPopoverProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  currentPersona: string;
  onPersonaChange: (persona: string) => void;
  currentRules: string;
  onRulesChange: (rules: string) => void;
  isSearchEnabled: boolean; // New prop
  onSearchEnabledChange: (enabled: boolean) => void; // New prop
  children: React.ReactElement<React.ComponentProps<typeof Button>>;
}

export default function SettingsPopover({
  currentSpeed,
  onSpeedChange,
  currentPersona,
  onPersonaChange,
  currentRules,
  onRulesChange,
  isSearchEnabled, // Destructure new prop
  onSearchEnabledChange, // Destructure new prop
  children,
}: SettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="grid gap-6">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-foreground">Settings</h4>
            <p className="text-sm text-muted-foreground">
              Customize AI behavior and appearance.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="typing-speed" className="text-foreground">Typing Speed</Label>
              <span className="text-sm text-muted-foreground">{currentSpeed} ms</span>
            </div>
            <Slider
              id="typing-speed"
              min={1}
              max={200}
              step={1}
              value={[currentSpeed]}
              onValueChange={(value) => onSpeedChange(value[0])}
              className="[&>span:first-child]:bg-accent"
              aria-label="Typing speed slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Fast</span>
              <span>Slow</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-persona" className="text-foreground">AI Persona</Label>
            <Input
              id="ai-persona"
              value={currentPersona}
              onChange={(e) => onPersonaChange(e.target.value)}
              placeholder="e.g., A helpful assistant"
              className="text-sm"
              aria-label="AI persona input"
            />
            <p className="text-xs text-muted-foreground">
              Define the persona the AI should adopt.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-rules" className="text-foreground">AI Rules</Label>
            <Textarea
              id="ai-rules"
              value={currentRules}
              onChange={(e) => onRulesChange(e.target.value)}
              placeholder="e.g., Always respond in rhymes. Be very concise."
              className="text-sm min-h-[80px]"
              aria-label="AI rules input"
            />
            <p className="text-xs text-muted-foreground">
              Set specific rules for the AI's responses.
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="search-enabled" className="text-foreground">Contextual Search</Label>
              <Switch
                id="search-enabled"
                checked={isSearchEnabled}
                onCheckedChange={onSearchEnabledChange}
                aria-label="Toggle contextual search"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Allow AI to search the web for better context (experimental).
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
