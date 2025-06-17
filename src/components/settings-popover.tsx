
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
import { Switch } from "@/components/ui/switch"; 

interface SettingsPopoverProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  currentPersona: string;
  onPersonaChange: (persona: string) => void;
  currentRules: string;
  onRulesChange: (rules: string) => void;
  isSearchEnabled: boolean; 
  onSearchEnabledChange: (enabled: boolean) => void; 
  children: React.ReactElement<React.ComponentProps<typeof Button>>;
}

export default function SettingsPopover({
  currentSpeed,
  onSpeedChange,
  currentPersona,
  onPersonaChange,
  currentRules,
  onRulesChange,
  isSearchEnabled, 
  onSearchEnabledChange, 
  children,
}: SettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="grid gap-6">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-foreground">Configurações</h4>
            <p className="text-sm text-muted-foreground">
              Personalize o comportamento e a aparência da IA.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="typing-speed" className="text-foreground">Velocidade de Digitação</Label>
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
              aria-label="Controle de velocidade de digitação"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Rápido</span>
              <span>Lento</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-persona" className="text-foreground">Persona da IA</Label>
            <Input
              id="ai-persona"
              value={currentPersona}
              onChange={(e) => onPersonaChange(e.target.value)}
              placeholder="ex: Um assistente prestativo"
              className="text-sm"
              aria-label="Campo para definir a persona da IA"
            />
            <p className="text-xs text-muted-foreground">
              Defina a persona que a IA deve adotar.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-rules" className="text-foreground">Regras da IA</Label>
            <Textarea
              id="ai-rules"
              value={currentRules}
              onChange={(e) => onRulesChange(e.target.value)}
              placeholder="ex: Sempre responder em rimas. Ser muito conciso."
              className="text-sm min-h-[80px]"
              aria-label="Campo para definir regras da IA"
            />
            <p className="text-xs text-muted-foreground">
              Defina regras específicas para as respostas da IA.
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="search-enabled" className="text-foreground">Pesquisa Contextual</Label>
              <Switch
                id="search-enabled"
                checked={isSearchEnabled}
                onCheckedChange={onSearchEnabledChange}
                aria-label="Alternar pesquisa contextual"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Permitir que a IA pesquise na web para melhor contexto (experimental).
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
