'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Message, User } from './chat';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { WebRTCService } from '@/lib/webrtc';
import { MessageStore } from '@/lib/db';

interface ChatAreaProps {
  selectedUser: User | null;
  currentUser: User;
  webrtc: WebRTCService | null;
  messageStore: MessageStore;
}

export function ChatArea({ 
  selectedUser, 
  currentUser, 
  webrtc,
  messageStore 
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (selectedUser && messageStore) {
      messageStore.getMessages(currentUser.id, selectedUser.id)
        .then(setMessages)
        .catch(console.error);
    }
  }, [selectedUser, currentUser.id, messageStore]);

  const handleSendMessage = async () => {
    if (!selectedUser || !newMessage.trim() || !webrtc) return;

    const message: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      content: newMessage,
      timestamp: Date.now(),
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
    };

    await messageStore.saveMessage(message);
    setMessages([...messages, message]);
    webrtc.sendMessage(message);
    setNewMessage('');
  };

  if (!selectedUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Select a user to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b p-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
            <AvatarFallback>{selectedUser.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{selectedUser.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedUser.online ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.senderId === currentUser.id;
            return (
              <div
                key={message.id}
                className={cn(
                  'flex items-start space-x-2',
                  isCurrentUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={isCurrentUser ? currentUser.avatar : message.senderAvatar} 
                    alt={isCurrentUser ? currentUser.name : message.senderName} 
                  />
                  <AvatarFallback>
                    {(isCurrentUser ? currentUser.name : message.senderName)[0]}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-4 py-2',
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex space-x-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}