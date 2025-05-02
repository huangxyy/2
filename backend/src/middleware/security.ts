import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/database';

// CORS配置
export const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24小时
};

// 速率限制配置
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100个请求
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: {
    // 使用Redis存储
    incr: (key: string) => redis.incr(key),
    decr: (key: string) => redis.decr(key),
    resetKey: (key: string) => redis.del(key),
  },
});

// IP黑名单中间件
export const ipBlacklist = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const isBlacklisted = await redis.sismember('ip_blacklist', ip);
  
  if (isBlacklisted) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};

// 安全响应头配置
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.API_URL as string],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  xssFilter: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});