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
import { requestNotificationPermission, sendChatNotification } from '@/lib/notification';

export type User = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  hasUnread: boolean;
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
  online: true,
  hasUnread: false
};

export function Chat() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(() => getUserData() || defaultUser);
  const [users, setUsers] = useState<User[]>([]);
  const [webrtc, setWebrtc] = useState<WebRTCService | null>(null);
  const [messageStore] = useState(() => new MessageStore());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(false);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 请求通知权限
  useEffect(() => {
    const requestPermission = async () => {
      try {
        // 在页面加载后立即请求权限，不再延迟
        console.log('请求通知权限...');
        const permission = await requestNotificationPermission();
        console.log('通知权限状态:', permission);
        setNotificationPermission(permission);
      } catch (error) {
        console.error('请求通知权限出错:', error);
      }
    };
    
    requestPermission();
  }, []);

  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
        console.log('收到用户信息更新:', user);
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === user.id);
          if (!exists) {
            return [...prev, user];
          }
          // 保留原有的 hasUnread 状态
          return prev.map((u) => (u.id === user.id ? { ...user, hasUnread: u.hasUnread || false } : u));
        });
      },
      async (message) => {
        console.log('收到新消息:', message);
        await messageStore.saveMessage(message);
        
        // 如果消息不是当前用户发送的，则可能需要发送通知
        if (message.senderId !== currentUser.id) {
          // 如果页面不可见或者用户没有选择发送消息的用户，则发送通知
          const shouldNotify = !isPageVisible || 
                              !selectedUser || 
                              selectedUser.id !== message.senderId;
          
          console.log('通知条件:', { 
            isPageVisible, 
            selectedUserId: selectedUser?.id, 
            messageSenderId: message.senderId,
            shouldNotify,
            notificationPermission
          });
          
          // 无论是否显示通知，只要不是当前选中的用户发送的消息，都添加未读标记
          if (message.senderId !== selectedUser?.id) {
            console.log('设置未读标记 - 之前的用户列表:', users);
            setUsers(prev => {
              const newUsers = prev.map(user => 
                user.id === message.senderId 
                  ? { ...user, hasUnread: true } 
                  : user
              );
              console.log('设置未读标记 - 更新后的用户列表:', newUsers);
              return newUsers;
            });
          }
          
          // 发送通知
          if (shouldNotify && notificationPermission) {
            console.log('发送通知:', message.senderName, message.content);
            sendChatNotification(message.senderName, message.content, message.senderAvatar);
          }
        }
        
        if (selectedUser && 
            (message.senderId === selectedUser.id || 
             message.receiverId === selectedUser.id)) {
          const messages = await messageStore.getMessages(currentUser.id, selectedUser.id);
          setMessages(messages);
          
          // 添加短暂延迟，确保消息加载后滚动到底部
          setTimeout(() => {
            const chatArea = document.querySelector('.chat-area-scroll');
            if (chatArea) {
              chatArea.scrollTop = chatArea.scrollHeight + 1000;
              console.log('WebRTC 消息接收后滚动到底部');
            }
          }, 100);
          
          // 如果当前正在查看该用户的消息，则清除未读标记
          if (message.senderId === selectedUser.id) {
            setUsers(prev => 
              prev.map(user => 
                user.id === selectedUser.id 
                  ? { ...user, hasUnread: false } 
                  : user
              )
            );
          }
        }
      }
    );

    setWebrtc(service);

    return () => {
      service.disconnect();
    };
  }, [currentUser.id, messageStore, selectedUser, isPageVisible, notificationPermission]);

  useEffect(() => {
    if (webrtc) {
      webrtc.broadcastUserInfo(currentUser);
    }
  }, [webrtc, currentUser]);

  useEffect(() => {
    // 当选择用户变化时，加载消息
    if (selectedUser && messageStore) {
      messageStore.getMessages(currentUser.id, selectedUser.id)
        .then((messages) => {
          setMessages(messages);
          // 添加短暂延迟，确保消息加载后滚动到底部
          setTimeout(() => {
            const chatArea = document.querySelector('.chat-area-scroll');
            if (chatArea) {
              chatArea.scrollTop = chatArea.scrollHeight + 1000;
            }
          }, 100);
        })
        .catch(console.error);
    }
  }, [selectedUser, currentUser.id, messageStore]);

  // 选择用户时清除未读标记
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    
    // 清除该用户的未读标记
    setUsers(prev => 
      prev.map(u => 
        u.id === user.id 
          ? { ...u, hasUnread: false } 
          : u
      )
    );
  };

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row">
      {/* 在移动端，如果选择了用户，则隐藏用户列表 */}
      {(!isMobile || (isMobile && !selectedUser)) && (
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          currentUser={currentUser}
        />
      )}
      
      {/* 在移动端，如果选择了用户，则显示聊天区域 */}
      {(!isMobile || (isMobile && selectedUser)) && (
        <div className="flex flex-1 flex-col">
          {isMobile && selectedUser && (
            <div className="flex items-center border-b p-2 sticky top-0 z-10 bg-background">
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