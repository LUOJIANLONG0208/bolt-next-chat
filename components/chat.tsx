'use client';

import { useEffect, useState } from 'react';
import { Navigation } from './navigation';
import { UserList } from './user-list';
import { ChatArea } from './chat-area';
import { getUserData } from '@/lib/utils';
import { WebRTCService } from '@/lib/webrtc';
import { MessageStore } from '@/lib/db';

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
          // Update ChatArea component with new messages
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

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      <UserList
        users={users}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        currentUser={currentUser}
      />
      <ChatArea 
        selectedUser={selectedUser} 
        currentUser={currentUser}
        webrtc={webrtc}
        messageStore={messageStore}
      />
      <Navigation />
    </div>
  );
}