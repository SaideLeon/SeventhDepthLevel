"use client";

import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { Button } from "@/components/ui/button"; // Only for type reference

interface SettingsPopoverProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  children: React.ReactElement<React.ComponentProps<typeof Button>>; // Expecting a Button as trigger
}

export default function SettingsPopover({
  currentSpeed,
  onSpeedChange,
  children,
}: SettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-foreground">Settings</h4>
            <p className="text-sm text-muted-foreground">
              Adjust the AI's typing speed.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="typing-speed" className="text-foreground">Typing Speed</Label>
              <span className="text-sm text-muted-foreground">{currentSpeed} ms</span>
            </div>
            <Slider
              id="typing-speed"
              min={10}
              max={200}
              step={10}
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
