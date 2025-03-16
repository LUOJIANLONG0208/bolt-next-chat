'use client';

import SimplePeer from 'simple-peer';
import { User, Message } from '@/components/chat';

export class WebRTCService {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private signalChannels: Map<string, BroadcastChannel> = new Map();
  private localId: string;
  private onUserCallback: (user: User) => void;
  private onMessageCallback: (message: Message) => void;
  private discoveryChannel: BroadcastChannel | null = null;

  constructor(
    localId: string,
    onUser: (user: User) => void,
    onMessage: (message: Message) => void
  ) {
    this.localId = localId;
    this.onUserCallback = onUser;
    this.onMessageCallback = onMessage;
    if (typeof window !== 'undefined') {
      this.startDiscovery();
    }
  }

  private startDiscovery() {
    this.discoveryChannel = new BroadcastChannel('local-chat-discovery');

    // Announce presence
    const announcePresence = () => {
      this.discoveryChannel?.postMessage({
        type: 'ANNOUNCE',
        id: this.localId,
      });
    };

    // Handle incoming announcements
    this.discoveryChannel.onmessage = (event) => {
      const { type, id } = event.data;
      if (type === 'ANNOUNCE' && id !== this.localId) {
        this.initiatePeerConnection(id);
      }
    };

    // Announce presence periodically
    announcePresence();
    setInterval(announcePresence, 5000);
  }

  private initiatePeerConnection(remoteId: string) {
    if (this.peers.has(remoteId)) {
      const existingPeer = this.peers.get(remoteId);
      if (existingPeer?.destroyed) {
        this.peers.delete(remoteId);
        this.signalChannels.get(remoteId)?.close();
        this.signalChannels.delete(remoteId);
      } else {
        return;
      }
    }

    const peer = new SimplePeer({
      initiator: this.localId < remoteId,
      trickle: false,
    });

    peer.on('signal', (data) => {
      // Send signaling data to remote peer
      const signalChannel = new BroadcastChannel(`local-chat-signal-${remoteId}`);
      this.signalChannels.set(remoteId, signalChannel);
      signalChannel.postMessage({
        type: 'SIGNAL',
        from: this.localId,
        data,
      });
    });

    peer.on('connect', () => {
      console.log('Peer connected:', remoteId);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      this.cleanupPeer(remoteId);
    });

    peer.on('close', () => {
      this.cleanupPeer(remoteId);
    });

    peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'USER_INFO') {
          this.onUserCallback(message.user);
        } else if (message.type === 'CHAT_MESSAGE') {
          this.onMessageCallback(message.message);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Listen for incoming signals
    const signalChannel = new BroadcastChannel(`local-chat-signal-${this.localId}`);
    this.signalChannels.set(this.localId, signalChannel);
    signalChannel.onmessage = (event) => {
      const { type, from, data } = event.data;
      if (type === 'SIGNAL' && from === remoteId && !peer.destroyed) {
        try {
          peer.signal(data);
        } catch (error) {
          console.error('Error signaling peer:', error);
          this.cleanupPeer(remoteId);
        }
      }
    };

    this.peers.set(remoteId, peer);
  }

  private cleanupPeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      if (!peer.destroyed) {
        peer.destroy();
      }
      this.peers.delete(peerId);
    }

    const signalChannel = this.signalChannels.get(peerId);
    if (signalChannel) {
      signalChannel.close();
      this.signalChannels.delete(peerId);
    }
  }

  sendMessage(message: Message) {
    const data = JSON.stringify({
      type: 'CHAT_MESSAGE',
      message,
    });

    // Send to all connected peers
    this.peers.forEach((peer) => {
      if (peer.connected && !peer.destroyed) {
        try {
          peer.send(data);
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    });
  }

  broadcastUserInfo(user: User) {
    const data = JSON.stringify({
      type: 'USER_INFO',
      user,
    });

    // Send to all connected peers
    this.peers.forEach((peer) => {
      if (peer.connected && !peer.destroyed) {
        try {
          peer.send(data);
        } catch (error) {
          console.error('Error broadcasting user info:', error);
        }
      }
    });
  }

  disconnect() {
    this.peers.forEach((peer, peerId) => {
      this.cleanupPeer(peerId);
    });
    this.discoveryChannel?.close();
    this.discoveryChannel = null;
  }
}