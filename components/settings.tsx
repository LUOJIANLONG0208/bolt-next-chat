'use client';

import { useState, useEffect } from 'react';
import { Navigation } from './navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getUserData, generateUUID } from '@/lib/utils';

export function UserSettings() {
  const [user, setUser] = useState(() => getUserData());
  const [name, setName] = useState(user?.name || '');

  const handleUpdateName = () => {
    if (!name.trim()) return;
    
    const updatedUser = { ...user, name: name.trim() };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    
    // 触发storage事件，以便其他组件可以监听到更改
    window.dispatchEvent(new Event('storage'));
  };

  const handleGenerateAvatar = () => {
    const updatedUser = {
      ...user,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${generateUUID()}`,
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    
    // 触发storage事件，以便其他组件可以监听到更改
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      <div className="space-y-8">
        <div className="space-y-4">
          <Label>Profile Picture</Label>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>{user?.name ? user?.name[0] : ''}</AvatarFallback>
            </Avatar>
            <Button onClick={handleGenerateAvatar}>Generate New Avatar</Button>
          </div>
        </div>

        <div className="space-y-4">
          <Label htmlFor="name">Display Name</Label>
          <div className="flex space-x-2">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your display name"
            />
            <Button onClick={handleUpdateName}>Update</Button>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="text-sm text-muted-foreground">
            Local Chat v1.0.0
            <br />A peer-to-peer chat application for local networks.
          </p>
        </div>
      </div>

      <Navigation />
    </div>
  );
}