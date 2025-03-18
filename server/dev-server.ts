import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const connectedPeers = new Map<string, string>();

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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Development server running on port ${PORT}`);
}); 