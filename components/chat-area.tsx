'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Smile } from 'lucide-react';
import { Message, User } from './chat';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, generateUUID } from '@/lib/utils';
import { WebRTCService } from '@/lib/webrtc';
import { MessageStore } from '@/lib/db';

interface ChatAreaProps {
  selectedUser: User | null;
  currentUser: User;
  webrtc: WebRTCService | null;
  messageStore: MessageStore;
  messages?: Message[];
}

export function ChatArea({ 
  selectedUser, 
  currentUser, 
  webrtc,
  messageStore,
  messages: externalMessages
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (externalMessages) {
      setMessages(externalMessages);
    } else if (selectedUser && messageStore) {
      messageStore.getMessages(currentUser.id, selectedUser.id)
        .then(setMessages)
        .catch(console.error);
    }
  }, [selectedUser, currentUser.id, messageStore, externalMessages]);

  const handleSendMessage = async () => {
    if (!selectedUser || !newMessage.trim() || !webrtc) return;

    const message: Message = {
      id: generateUUID(),
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
    
    // 发送后聚焦输入框
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // 分组消息（按日期）
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    
    messages.forEach((message) => {
      const messageDate = formatDate(message.timestamp);
      const existingGroup = groups.find((group) => group.date === messageDate);
      
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date: messageDate, messages: [message] });
      }
    });
    
    return groups;
  };

  if (!selectedUser) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">选择一个用户开始聊天</p>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex flex-1 flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
            <AvatarFallback>{selectedUser.name ? selectedUser.name[0] : ''}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{selectedUser.name}</p>
            <p className="text-xs text-muted-foreground">
              {selectedUser.online ? '在线' : '离线'}
            </p>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 p-4 overflow-y-auto" 
        ref={scrollAreaRef}
      >
        {messageGroups.length > 0 ? (
          <div className="space-y-6 pb-4">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4">
                <div className="flex justify-center">
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    {group.date}
                  </span>
                </div>
                
                {group.messages.map((message) => {
                  const isCurrentUser = message.senderId === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex items-end space-x-2',
                        isCurrentUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                      )}
                    >
                      {!isCurrentUser && (
                        <Avatar className="h-8 w-8 mb-1">
                          <AvatarImage 
                            src={message.senderAvatar} 
                            alt={message.senderName} 
                          />
                          <AvatarFallback>
                            {message.senderName ? message.senderName[0] : ''}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex flex-col">
                        <div
                          className={cn(
                            'max-w-[80vw] md:max-w-[40vw] rounded-2xl px-4 py-2 relative',
                            isCurrentUser
                              ? 'bg-primary text-primary-foreground rounded-tr-none'
                              : 'bg-muted rounded-tl-none'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <span 
                          className={cn(
                            "text-xs text-muted-foreground mt-1",
                            isCurrentUser ? "text-right" : "text-left"
                          )}
                        >
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-2">没有消息</p>
            <p className="text-sm text-muted-foreground">
              发送一条消息开始聊天
            </p>
          </div>
        )}
      </div>

      <div className="border-t p-3 sticky bottom-0 bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <Button 
            type="button" 
            size="icon" 
            variant="ghost"
            className="flex-shrink-0"
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 rounded-full"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full flex-shrink-0"
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}