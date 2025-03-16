'use client';

import { MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background">
      <div className="mx-auto flex max-w-md justify-around p-2">
        <Link
          href="/"
          className={cn(
            'flex flex-col items-center p-2 transition-colors hover:text-primary',
            pathname === '/' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="text-xs">Chat</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            'flex flex-col items-center p-2 transition-colors hover:text-primary',
            pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Settings className="h-6 w-6" />
          <span className="text-xs">Settings</span>
        </Link>
      </div>
    </nav>
  );
}