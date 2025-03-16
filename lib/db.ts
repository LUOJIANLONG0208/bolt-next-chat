'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Message } from '@/components/chat';

interface ChatDB extends DBSchema {
  messages: {
    key: string;
    value: Message;
    indexes: { 'by-timestamp': number };
  };
}

export class MessageStore {
  private db: Promise<IDBPDatabase<ChatDB>> | null = null;

  constructor() {
    // Only initialize IndexedDB in the browser
    if (typeof window !== 'undefined') {
      this.db = openDB<ChatDB>('local-chat', 1, {
        upgrade(db) {
          const store = db.createObjectStore('messages', {
            keyPath: 'id',
          });
          store.createIndex('by-timestamp', 'timestamp');
        },
      });
    }
  }

  async saveMessage(message: Message): Promise<void> {
    if (!this.db) return;
    const db = await this.db;
    await db.put('messages', message);
  }

  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    if (!this.db) return [];
    const db = await this.db;
    const messages = await db.getAllFromIndex('messages', 'by-timestamp');
    return messages.filter(
      (msg) =>
        (msg.senderId === userId1 && msg.receiverId === userId2) ||
        (msg.senderId === userId2 && msg.receiverId === userId1)
    );
  }
}