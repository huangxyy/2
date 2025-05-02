import { Request, Response, NextFunction } from 'express';
import { createLogger, format, transports } from 'winston';

// 创建审计日志记录器
const auditLogger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'audit.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // 响应结束时记录日志
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    auditLogger.info('API Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('user-agent'),
      query: req.query,
      body: req.body,
    });
  });

  next();
};