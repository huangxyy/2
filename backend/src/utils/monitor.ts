import prometheus from 'prom-client';
import responseTime from 'response-time';
import { Request, Response, NextFunction } from 'express';

// 初始化 Prometheus 注册表
const register = new prometheus.Registry();

// HTTP 请求计数器
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// HTTP 请求持续时间
const httpRequestDurationMs = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 30, 50, 100, 200, 500, 1000, 2000, 5000],
});

// 活跃用户计数器
const activeUsers = new prometheus.Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

// 数据库连接池指标
const dbPoolTotal = new prometheus.Gauge({
  name: 'db_pool_total',
  help: 'Total number of database connections in the pool',
});

const dbPoolIdle = new prometheus.Gauge({
  name: 'db_pool_idle',
  help: 'Number of idle database connections in the pool',
});

const dbPoolUsed = new prometheus.Gauge({
  name: 'db_pool_used',
  help: 'Number of used database connections in the pool',
});

// 缓存命中率
const cacheHits = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
});

const cacheMisses = new prometheus.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
});

// 注册指标
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationMs);
register.registerMetric(activeUsers);
register.registerMetric(dbPoolTotal);
register.registerMetric(dbPoolIdle);
register.registerMetric(dbPoolUsed);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);

// 请求监控中间件
export const requestMonitor = responseTime((req: Request, res: Response, time: number) => {
  const route = req.route?.path || 'unknown';
  const method = req.method;
  const status = res.statusCode;

  httpRequestsTotal.inc({ method, route, status });
  httpRequestDurationMs.observe({ method, route, status }, time);
});

// 更新数据库连接池指标
export const updateDbPoolMetrics = (pool: any) => {
  dbPoolTotal.set(pool.totalCount);
  dbPoolIdle.set(pool.idleCount);
  dbPoolUsed.set(pool.totalCount - pool.idleCount);
};

// 更新缓存指标
export const updateCacheMetrics = (hit: boolean) => {
  if (hit) {
    cacheHits.inc();
  } else {
    cacheMisses.inc();
  }
};

// 更新活跃用户指标
export const updateActiveUsers = (count: number) => {
  activeUsers.set(count);
};

// 指标导出端点
export const metricsEndpoint = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};

// 健康检查端点
export const healthCheck = async (_req: Request, res: Response) => {
  try {
    // 检查数据库连接
    await db.query('SELECT 1');
    
    // 检查缓存连接
    await cacheService.ping();
    
    // 检查搜索服务
    await searchService.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        cache: 'up',
        search: 'up',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};