import { WebSocket } from 'ws';
import { achievementEvents } from '../services/AchievementService';

export function setupAchievementWebSocket(wss: WebSocket.Server) {
  achievementEvents.on('achievement_unlocked', ({ userId, achievement }) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(JSON.stringify({
          type: 'achievement_unlocked',
          data: {
            achievement,
            timestamp: new Date().toISOString(),
          },
        }));
      }
    });
  });
}