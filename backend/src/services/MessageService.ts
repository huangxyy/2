import { Message } from '../models/Message';
import { User } from '../models/User';
import { WebSocket } from 'ws';
import { Op } from 'sequelize';

export class MessageService {
  private wss: WebSocket.Server;

  constructor(wss: WebSocket.Server) {
    this.wss = wss;
  }

  // 发送私信
  async sendMessage(senderId: number, receiverId: number, content: string) {
    const message = await Message.create({
      senderId,
      receiverId,
      content,
    });

    // 通过WebSocket发送实时通知
    this.notifyUser(receiverId, {
      type: 'new_message',
      data: {
        id: message.id,
        senderId,
        content,
        createdAt: message.createdAt,
      },
    });

    return message;
  }

  // 获取对话列表
  async getConversations(userId: number) {
    // 获取最近的消息
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, deletedBySender: false },
          { receiverId: userId, deletedByReceiver: false },
        ],
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatar'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'username', 'avatar'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // 按对话分组
    const conversations = new Map();
    messages.forEach(message => {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      if (!conversations.has(otherUserId)) {
        const otherUser = message.senderId === userId ? message.receiver : message.sender;
        conversations.set(otherUserId, {
          user: otherUser,
          lastMessage: message,
          unreadCount: message.senderId !== userId && !message.isRead ? 1 : 0,
        });
      } else if (message.senderId !== userId && !message.isRead) {
        const conv = conversations.get(otherUserId);
        conv.unreadCount++;
      }
    });

    return Array.from(conversations.values());
  }

  // 获取与特定用户的对话历史
  async getMessageHistory(userId: number, otherUserId: number, page = 1, pageSize = 20) {
    const messages = await Message.findAndCountAll({
      where: {
        [Op.or]: [
          {
            senderId: userId,
            receiverId: otherUserId,
            deletedBySender: false,
          },
          {
            senderId: otherUserId,
            receiverId: userId,
            deletedByReceiver: false,
          },
        ],
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatar'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    // 标记消息为已读
    await Message.update(
      {
        isRead: true,
        readAt: new Date(),
      },
      {
        where: {
          senderId: otherUserId,
          receiverId: userId,
          isRead: false,
        },
      }
    );

    return {
      messages: messages.rows,
      total: messages.count,
      page,
      pageSize,
    };
  }

  // 删除消息
  async deleteMessage(messageId: number, userId: number) {
    const message = await Message.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId === userId) {
      message.deletedBySender = true;
    } else if (message.receiverId === userId) {
      message.deletedByReceiver = true;
    } else {
      throw new Error('Unauthorized');
    }

    if (message.deletedBySender && message.deletedByReceiver) {
      await message.destroy();
    } else {
      await message.save();
    }
  }

  // 通过WebSocket发送通知
  private notifyUser(userId: number, data: any) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(JSON.stringify(data));
      }
    });
  }
}