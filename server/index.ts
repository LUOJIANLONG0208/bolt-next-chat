import { SocketHandler } from '@vercel/node';
import { Server } from 'socket.io';

const connectedPeers = new Map<string, string>();

const ioHandler: SocketHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('register', (userId: string) => {
        console.log('User registered:', userId, 'with socket:', socket.id);
        connectedPeers.set(userId, socket.id);
        socket.data.userId = userId;
        const peerList = Array.from(connectedPeers.keys());
        console.log('Current peers:', peerList);
        io.emit('peers', peerList);
      });

      socket.on('signal', ({ to, from, data }: { to: string; from: string; data: any }) => {
        console.log('Signal from', from, 'to', to);
        const toSocketId = connectedPeers.get(to);
        if (toSocketId) {
          console.log('Forwarding signal to socket:', toSocketId);
          io.to(toSocketId).emit('signal', {
            from,
            data
          });
        } else {
          console.log('Target peer not found:', to);
        }
      });

      socket.on('disconnect', () => {
        const userId = socket.data.userId;
        if (userId) {
          console.log('User disconnected:', userId);
          connectedPeers.delete(userId);
          io.emit('peer-disconnected', userId);
          console.log('Remaining peers:', Array.from(connectedPeers.keys()));
        }
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default ioHandler; 