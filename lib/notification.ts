'use client';

// 扩展 NotificationOptions 类型
interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  tag?: string;
  silent?: boolean;
  vibrate?: number[];
}

// 检查浏览器是否支持通知
export function checkNotificationSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

// 请求通知权限
export async function requestNotificationPermission(): Promise<boolean> {
  if (!checkNotificationSupport()) {
    console.log('此浏览器不支持通知功能');
    return false;
  }
  
  try {
    console.log('请求通知权限...', Notification.permission);
    // 检查当前权限状态
    if (Notification.permission === 'granted') {
      console.log('已有通知权限');
      return true;
    }
    
    if (Notification.permission === 'denied') {
      console.log('通知权限已被拒绝');
      return false;
    }
    
    // 请求权限
    const permission = await Notification.requestPermission();
    console.log('通知权限请求结果:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('请求通知权限失败:', error);
    return false;
  }
}

// 发送通知
export function sendNotification(title: string, options?: ExtendedNotificationOptions): Notification | null {
  if (typeof window === 'undefined') return null;
  
  // 检查浏览器是否支持通知
  if (!checkNotificationSupport()) {
    console.log('此浏览器不支持通知功能');
    return null;
  }
  
  // 检查是否有通知权限
  if (Notification.permission !== 'granted') {
    console.log('没有通知权限');
    return null;
  }
  
  // 创建并发送通知
  try {
    const notification = new Notification(title, options as NotificationOptions);
    
    // 点击通知时的行为
    notification.onclick = () => {
      // 如果应用最小化或在后台，则聚焦应用窗口
      window.focus();
      // 关闭通知
      notification.close();
    };
    
    return notification;
  } catch (error) {
    console.error('发送通知失败:', error);
    return null;
  }
}

// 发送聊天消息通知
export function sendChatNotification(senderName: string, message: string, avatar?: string): Notification | null {
  // 播放通知声音
  playNotificationSound();
  
  return sendNotification(`来自 ${senderName} 的新消息`, {
    body: message,
    icon: avatar || '/default-avatar.png',
    badge: '/notification-badge.png',
    tag: `chat-${senderName}`, // 使用标签来分组通知
    renotify: true, // 即使有相同标签的通知，也显示新通知
    silent: false, // 播放声音
    vibrate: [200, 100, 200], // 振动模式（如果设备支持）
  });
}

// 播放通知声音
function playNotificationSound() {
  try {
    console.log('尝试播放通知声音...');
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5;
    
    // 添加事件监听器
    audio.oncanplaythrough = () => console.log('音频已加载完成，可以播放');
    audio.onplay = () => console.log('音频开始播放');
    audio.onerror = (e) => console.error('音频播放错误:', e);
    
    audio.play().catch(err => {
      console.log('无法播放通知声音:', err);
    });
  } catch (error) {
    console.log('播放通知声音失败:', error);
  }
} 