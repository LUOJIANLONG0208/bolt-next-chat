'use client';

import { RefreshCw } from 'lucide-react';
import { User } from './chat';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  currentUser: User;
}

export function UserList({
  users,
  selectedUser,
  onSelectUser,
  currentUser,
}: UserListProps) {
  const onlineUsers = users.filter((user) => user.id !== currentUser.id);

  const handleRescan = () => {
    // Force a new discovery announcement
    window.location.reload();
  };

  return (
    <div className="border-r bg-muted/10 md:w-1/4">
      <div className="p-4">
        <Button
          variant="outline"
          className="mb-4 w-full justify-start gap-2"
          onClick={handleRescan}
        >
          <RefreshCw className="h-4 w-4" />
          Scan Network
        </Button>

        {onlineUsers.length > 0 && (
          <h2 className="mb-4 font-semibold">Online Users</h2>
        )}
        
        <ScrollArea className="h-[calc(100dvh-8rem)]">
          <div className="space-y-4">
            {onlineUsers.map((user) => (
              <button
                key={user.id}
                className={cn(
                  'flex w-full items-center space-x-4 rounded-lg p-2 transition-colors hover:bg-muted/50',
                  selectedUser?.id === user.id && 'bg-muted'
                )}
                onClick={() => onSelectUser(user)}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  {user.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}