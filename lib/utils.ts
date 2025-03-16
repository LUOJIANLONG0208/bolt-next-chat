import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let userCounter = 0;

export function generateName(): string {
  // Get the counter from localStorage or initialize it
  if (typeof window !== 'undefined') {
    const storedCounter = localStorage.getItem('userCounter');
    userCounter = storedCounter ? parseInt(storedCounter, 10) : 0;
    userCounter++;
    localStorage.setItem('userCounter', userCounter.toString());
  }
  return `user${userCounter.toString().padStart(3, '0')}`;
}

export function getUserData() {
  if (typeof window === 'undefined') return null;
  
  const userData = localStorage.getItem('user');
  if (userData) {
    return JSON.parse(userData);
  }
  
  // Generate new user data only if it doesn't exist
  const newUser = {
    id: generateUUID(),
    name: generateName(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${generateUUID()}`,
    online: true,
  };
  
  localStorage.setItem('user', JSON.stringify(newUser));
  return newUser;
}