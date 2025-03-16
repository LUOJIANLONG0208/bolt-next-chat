'use client';

import { useEffect, useState } from 'react';
import { Navigation } from './navigation';
import { UserList } from './user-list';
import { ChatArea } from './chat-area';
import { getUserData } from '@/lib/utils';
import { WebRTCService } from '@/lib/webrtc';
import { MessageStore } from '@/lib/db';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

export type User = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
};

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  senderName: string;
  senderAvatar: string;
};

const defaultUser: User = {
  id: 'default',
  name: 'Guest',
  avatar: '/default-avatar.png',
  online: true
};

export function Chat() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(() => getUserData() || defaultUser);
  const [users, setUsers] = useState<User[]>([]);
  const [webrtc, setWebrtc] = useState<WebRTCService | null>(null);
  const [messageStore] = useState(() => new MessageStore());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 返回用户列表（仅在移动端有效）
  const handleBackToUserList = () => {
    setSelectedUser(null);
  };

  useEffect(() => {
    // Update current user when localStorage changes
    const handleStorageChange = () => {
      const userData = getUserData();
      if (userData) {
        setCurrentUser(userData);
        if (webrtc) {
          webrtc.broadcastUserInfo(userData);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [webrtc]);

  useEffect(() => {
    const service = new WebRTCService(
      currentUser.id,
      (user) => {
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === user.id);
          if (!exists) {
            return [...prev, user];
          }
          return prev.map((u) => (u.id === user.id ? user : u));
        });
      },
      async (message) => {
        await messageStore.saveMessage(message);
        if (selectedUser && 
            (message.senderId === selectedUser.id || 
             message.receiverId === selectedUser.id)) {
          const messages = await messageStore.getMessages(currentUser.id, selectedUser.id);
          setMessages(messages);
        }
      }
    );

    setWebrtc(service);

    return () => {
      service.disconnect();
    };
  }, [currentUser.id, messageStore, selectedUser]);

  useEffect(() => {
    if (webrtc) {
      webrtc.broadcastUserInfo(currentUser);
    }
  }, [webrtc, currentUser]);

  useEffect(() => {
    // 当选择用户变化时，加载消息
    if (selectedUser && messageStore) {
      messageStore.getMessages(currentUser.id, selectedUser.id)
        .then(setMessages)
        .catch(console.error);
    }
  }, [selectedUser, currentUser.id, messageStore]);

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      {/* 在移动端，如果选择了用户，则隐藏用户列表 */}
      {(!isMobile || (isMobile && !selectedUser)) && (
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          currentUser={currentUser}
        />
      )}
      
      {/* 在移动端，如果选择了用户，则显示聊天区域 */}
      {(!isMobile || (isMobile && selectedUser)) && (
        <div className="flex flex-1 flex-col">
          {isMobile && selectedUser && (
            <div className="flex items-center border-b p-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBackToUserList}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="font-medium">返回</span>
            </div>
          )}
          <ChatArea 
            selectedUser={selectedUser} 
            currentUser={currentUser}
            webrtc={webrtc}
            messageStore={messageStore}
            messages={messages}
          />
        </div>
      )}
      
      {/* 只在未选择用户时显示导航栏 */}
      {!isMobile || !selectedUser ? <Navigation /> : null}
    </div>
  );
}