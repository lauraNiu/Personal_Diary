import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={100}>
    {children}
  </TooltipPrimitive.Provider>
);

interface TipProps {
  title: string;
  desc?: string;
  shortcut?: string;
  warning?: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ title, desc, shortcut, warning, children, side = 'bottom' }: TipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-xs px-3 py-2 rounded-lg shadow-lg
                     bg-slate-900 dark:bg-slate-700 text-white text-xs
                     animate-in fade-in zoom-in-95"
        >
          <div className="font-semibold text-sm">{title}</div>
          {desc && <div className="text-slate-300 mt-0.5">{desc}</div>}
          {warning && (
            <div className="text-red-300 mt-1 flex items-center gap-1">
              <span>⚠</span>
              <span>{warning}</span>
            </div>
          )}
          {shortcut && (
            <div className="mt-1.5">
              <kbd className="px-1.5 py-0.5 rounded text-xs bg-slate-700 dark:bg-slate-800 border border-slate-600">
                {shortcut}
              </kbd>
            </div>
          )}
          <TooltipPrimitive.Arrow className="fill-slate-900 dark:fill-slate-700" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
