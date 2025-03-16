'use client';

import SimplePeer from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import { User, Message } from '@/components/chat';

const SIGNALING_SERVER = 'http://192.168.3.56:3001';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCService {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private localId: string;
  private onUserCallback: (user: User) => void;
  private onMessageCallback: (message: Message) => void;
  private socket: Socket | null = null;

  constructor(
    localId: string,
    onUser: (user: User) => void,
    onMessage: (message: Message) => void
  ) {
    console.log('Initializing WebRTC service with local ID:', localId);
    this.localId = localId;
    this.onUserCallback = onUser;
    this.onMessageCallback = onMessage;
    if (typeof window !== 'undefined') {
      this.connectToSignalingServer();
    }
  }

  private connectToSignalingServer() {
    console.log('Connecting to signaling server:', SIGNALING_SERVER);
    this.socket = io(SIGNALING_SERVER, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.socket?.emit('register', this.localId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    this.socket.on('peers', (peerIds: string[]) => {
      console.log('Received peers:', peerIds);
      peerIds.forEach(peerId => {
        if (peerId !== this.localId && !this.peers.has(peerId)) {
          console.log('Initiating connection with peer:', peerId);
          this.initiatePeerConnection(peerId);
        }
      });
    });

    this.socket.on('signal', ({ from, data }: { from: string; data: any }) => {
      console.log('Received signal from:', from, 'data:', data);
      const peer = this.peers.get(from);
      if (peer && !peer.destroyed) {
        try {
          peer.signal(data);
        } catch (error) {
          console.error('Error signaling peer:', error);
          this.cleanupPeer(from);
        }
      } else {
        console.log('No peer found for ID:', from, 'or peer is destroyed');
      }
    });

    this.socket.on('peer-disconnected', (peerId: string) => {
      console.log('Peer disconnected:', peerId);
      this.cleanupPeer(peerId);
    });
  }

  private initiatePeerConnection(remoteId: string) {
    if (this.peers.has(remoteId)) {
      const existingPeer = this.peers.get(remoteId);
      if (existingPeer?.destroyed) {
        console.log('Cleaning up destroyed peer:', remoteId);
        this.peers.delete(remoteId);
      } else {
        console.log('Peer connection already exists:', remoteId);
        return;
      }
    }

    console.log('Creating new peer connection with:', remoteId);
    const peer = new SimplePeer({
      initiator: this.localId < remoteId,
      trickle: true,
      config: ICE_SERVERS
    });

    peer.on('signal', (data) => {
      console.log('Generated signal for peer:', remoteId, 'data:', data);
      this.socket?.emit('signal', {
        to: remoteId,
        from: this.localId,
        data,
      });
    });

    peer.on('connect', () => {
      console.log('Peer connection established:', remoteId);
      // Send initial user info
      this.broadcastUserInfo({
        id: this.localId,
        name: 'User ' + this.localId,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.localId}`,
        online: true
      });
    });

    peer.on('error', (err) => {
      console.error('Peer connection error:', err);
      this.cleanupPeer(remoteId);
    });

    peer.on('close', () => {
      console.log('Peer connection closed:', remoteId);
      this.cleanupPeer(remoteId);
    });

    peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received data from peer:', remoteId, 'message:', message);
        if (message.type === 'USER_INFO') {
          this.onUserCallback(message.user);
        } else if (message.type === 'CHAT_MESSAGE') {
          this.onMessageCallback(message.message);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.peers.set(remoteId, peer);
  }

  private cleanupPeer(peerId: string) {
    console.log('Cleaning up peer:', peerId);
    const peer = this.peers.get(peerId);
    if (peer) {
      if (!peer.destroyed) {
        peer.destroy();
      }
      this.peers.delete(peerId);
    }
  }

  sendMessage(message: Message) {
    const data = JSON.stringify({
      type: 'CHAT_MESSAGE',
      message,
    });

    this.peers.forEach((peer, peerId) => {
      if (peer.connected && !peer.destroyed) {
        try {
          console.log('Sending message to peer:', peerId);
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

    this.peers.forEach((peer, peerId) => {
      if (peer.connected && !peer.destroyed) {
        try {
          console.log('Broadcasting user info to peer:', peerId);
          peer.send(data);
        } catch (error) {
          console.error('Error broadcasting user info:', error);
        }
      }
    });
  }

  disconnect() {
    console.log('Disconnecting WebRTC service');
    this.peers.forEach((peer, peerId) => {
      this.cleanupPeer(peerId);
    });
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}