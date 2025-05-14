"use client";

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  message?: string;
}

export function LoadingSpinner({ size = 24, className, message }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground", className)}>
      <Loader2 style={{ width: size, height: size }} className="animate-spin text-accent" />
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
