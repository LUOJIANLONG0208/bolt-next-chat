'use client';

import { RefreshCw, Users, Bell } from 'lucide-react';
import { User } from './chat';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { checkNotificationSupport, requestNotificationPermission } from '@/lib/notification';

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
  const [notificationPermission, setNotificationPermission] = useState<string | null>(null);
  const [notificationSupported, setNotificationSupported] = useState(false);

  // 检查通知权限状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSupported = checkNotificationSupport();
      setNotificationSupported(isSupported);
      
      if (isSupported) {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  const handleRescan = () => {
    // Force a new discovery announcement
    window.location.reload();
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
    }
  };

  return (
    <div className="flex flex-col border-r bg-muted/10 w-full md:w-1/4">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold mb-2 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          聊天
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          在局域网中发现 {onlineUsers.length} 个用户
        </p>
        <div className="flex flex-col space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleRescan}
          >
            <RefreshCw className="h-4 w-4" />
            扫描网络
          </Button>
          
          {notificationSupported && notificationPermission !== 'granted' && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleRequestPermission}
            >
              <Bell className="h-4 w-4" />
              开启消息通知
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-hidden">
        {onlineUsers.length > 0 ? (
          <>
            <h2 className="mb-4 font-semibold">在线用户</h2>
            <ScrollArea className="h-[calc(100dvh-14rem)]">
              <div className="space-y-4">
                {onlineUsers.map((user) => (
                  <button
                    key={user.id}
                    className={cn(
                      'flex w-full items-center space-x-4 rounded-lg p-3 transition-colors hover:bg-muted/50',
                      selectedUser?.id === user.id && 'bg-muted'
                    )}
                    onClick={() => onSelectUser(user)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name ? user.name[0] : ''}</AvatarFallback>
                      </Avatar>
                      {user.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{user.name}</p>
                        {user.hasUnread && (
                          <span className="h-4 w-4 rounded-full bg-red-500 flex-shrink-0 ml-2 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {user.hasUnread ? '有新消息' : '点击开始聊天'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100dvh-14rem)] text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">没有发现其他用户</p>
            <p className="text-sm text-muted-foreground">
              确保其他设备也在同一网络上运行此应用
            </p>
          </div>
        )}
      </div>
    </div>
  );
}