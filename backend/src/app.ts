import express from 'express';
import { requestLogger, errorLogger } from './utils/logger';
import { requestMonitor, metricsEndpoint, healthCheck } from './utils/monitor';
import routes from './routes';

const app = express();

// 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志和监控中间件
app.use(requestLogger);
app.use(requestMonitor);

// 健康检查和指标端点
app.get('/health', healthCheck);
app.get('/metrics', metricsEndpoint);

// API路由
app.use('/api', routes);

// 错误处理
app.use(errorLogger);
app.use(errorHandler);

export default app;