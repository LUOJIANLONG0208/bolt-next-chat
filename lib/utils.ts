import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 获取设备唯一标识符
function getDeviceId() {
  if (typeof window === 'undefined') return generateUUID();
  
  // 尝试从 localStorage 获取设备 ID
  let deviceId = localStorage.getItem('deviceId');
  
  // 如果没有，则生成一个新的并保存
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  
  return deviceId;
}

export function generateName(): string {
  // 获取设备 ID 的后 4 位
  const deviceId = getDeviceId();
  const lastFourChars = deviceId.slice(-4);
  
  return `user${lastFourChars}`;
}

export function getUserData() {
  if (typeof window === 'undefined') return null;
  
  const userData = localStorage.getItem('user');
  if (userData) {
    const parsedUser = JSON.parse(userData);
    // 确保用户数据包含 hasUnread 属性
    if (parsedUser.hasUnread === undefined) {
      parsedUser.hasUnread = false;
      localStorage.setItem('user', JSON.stringify(parsedUser));
    }
    return parsedUser;
  }
  
  // Generate new user data only if it doesn't exist
  const newUser = {
    id: generateUUID(),
    name: generateName(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${generateUUID()}`,
    online: true,
    hasUnread: false,
  };
  
  localStorage.setItem('user', JSON.stringify(newUser));
  return newUser;
}