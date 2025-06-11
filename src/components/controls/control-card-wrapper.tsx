import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ControlCardWrapperProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ControlCardWrapper({ title, children, className }: ControlCardWrapperProps) {
  return (
    <Card className={cn("bg-card shadow-md", className)}>
      <CardHeader>
        <CardTitle className="text-xl text-primary-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
