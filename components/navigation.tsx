'use client';

import { MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-10">
      <div className="mx-auto flex justify-around p-2">
        <Link
          href="/"
          className={cn(
            'flex flex-col items-center p-2 transition-colors hover:text-primary',
            pathname === '/' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="text-xs">聊天</span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            'flex flex-col items-center p-2 transition-colors hover:text-primary',
            pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Settings className="h-6 w-6" />
          <span className="text-xs">设置</span>
        </Link>
      </div>
    </nav>
  );
}