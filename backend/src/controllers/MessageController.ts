import { Request, Response } from 'express';
import { MessageService } from '../services/MessageService';
import { validate } from '../middleware/validator';
import { body } from 'express-validator';

export class MessageController {
  private messageService: MessageService;

  constructor(wss: WebSocket.Server) {
    this.messageService = new MessageService(wss);
  }

  // 发送消息
  sendMessage = [
    validate([
      body('receiverId').isInt(),
      body('content').isString().notEmpty().trim(),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { receiverId, content } = req.body;
        const message = await this.messageService.sendMessage(
          req.user!.id,
          receiverId,
          content
        );
        res.json({ data: message });
      } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
      }
    },
  ];

  // 获取对话列表
  async getConversations(req: Request, res: Response) {
    try {
      const conversations = await this.messageService.getConversations(req.user!.id);
      res.json({ data: conversations });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }

  // 获取消息历史
  async getMessageHistory(req: Request, res: Response) {
    try {
      const { otherUserId } = req.params;
      const { page = 1, pageSize = 20 } = req.query;
      const history = await this.messageService.getMessageHistory(
        req.user!.id,
        parseInt(otherUserId),
        parseInt(page as string),
        parseInt(pageSize as string)
      );
      res.json({ data: history });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch message history' });
    }
  }

  // 删除消息
  async deleteMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      await this.messageService.deleteMessage(
        parseInt(messageId),
        req.user!.id
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }
}