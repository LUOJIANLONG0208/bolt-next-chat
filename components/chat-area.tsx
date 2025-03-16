'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Smile, ArrowDown } from 'lucide-react';
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
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 检测是否需要显示滚动到底部按钮
  const checkScrollPosition = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      // 如果距离底部超过200px，显示滚动按钮
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom);
    }
  };

  // 监听滚动事件
  useEffect(() => {
    const scrollElement = scrollAreaRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollPosition);
      return () => scrollElement.removeEventListener('scroll', checkScrollPosition);
    }
  }, []);

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      // 直接设置滚动位置，不使用动画效果，确保立即滚动到底部
      scrollElement.scrollTop = scrollElement.scrollHeight + 1000;
      console.log('立即滚动到底部', scrollElement.scrollHeight);
      
      // 为确保在所有情况下都能滚动到底部，使用多个延时调用
      setTimeout(() => {
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight + 1000;
        }
      }, 50);
      
      setTimeout(() => {
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight + 1000;
        }
      }, 150);
      
      setTimeout(() => {
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight + 1000;
        }
      }, 300);
    }
  };

  // 消息变化时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 当组件挂载和更新时滚动到底部
  useEffect(() => {
    // 组件挂载时滚动到底部
    scrollToBottom();
    
    // 监听窗口大小变化，确保在窗口大小变化时也滚动到底部
    const handleResize = () => {
      scrollToBottom();
    };
    
    window.addEventListener('resize', handleResize);
    
    // 使用 MutationObserver 监听消息容器的变化
    if (scrollAreaRef.current) {
      const observer = new MutationObserver(scrollToBottom);
      observer.observe(scrollAreaRef.current, { childList: true, subtree: true });
      
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', handleResize);
      };
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 初始加载消息时滚动到底部
  useEffect(() => {
    if (externalMessages) {
      setMessages(externalMessages);
      scrollToBottom();
    } else if (selectedUser && messageStore) {
      messageStore.getMessages(currentUser.id, selectedUser.id)
        .then((msgs) => {
          setMessages(msgs);
          scrollToBottom();
        })
        .catch(console.error);
    }
  }, [selectedUser, currentUser.id, messageStore, externalMessages]);

  // 获取用户信息（用于显示头像和名称）
  const getUserInfo = (userId: string) => {
    if (userId === currentUser.id) {
      return currentUser;
    }
    if (selectedUser && userId === selectedUser.id) {
      return selectedUser;
    }
    return null;
  };

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
    
    // 发送后聚焦输入框并滚动到底部
    if (inputRef.current) {
      inputRef.current.focus();
    }
    scrollToBottom();
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
    <div className="flex flex-1 flex-col h-full relative">
      <div className="border-b p-4 sticky top-0 z-10 bg-background">
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
        className="flex-1 p-4 overflow-y-auto overscroll-none chat-area-scroll" 
        ref={scrollAreaRef}
        onScroll={checkScrollPosition}
        style={{ 
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'thin',
          paddingBottom: '60px', // 确保底部有足够的空间，不被输入框遮挡
          paddingTop: '10px' // 确保顶部有足够的空间，不被头部遮挡
        }}
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
                  const senderInfo = getUserInfo(message.senderId);
                  
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
                            src={senderInfo?.avatar || message.senderAvatar} 
                            alt={senderInfo?.name || message.senderName} 
                          />
                          <AvatarFallback>
                            {senderInfo?.name?.[0] || message.senderName?.[0] || ''}
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

      {/* 滚动到底部按钮 */}
      {showScrollButton && (
        <Button
          className="absolute bottom-20 right-4 rounded-full h-10 w-10 flex items-center justify-center shadow-lg"
          onClick={scrollToBottom}
          size="icon"
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}

      <div className="border-t p-3 sticky bottom-0 bg-background z-10">
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
            onKeyDown={(e) => {
              // 按下回车键发送消息，但按下Shift+Enter时不发送（允许换行）
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
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