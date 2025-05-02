import Redis from 'ioredis';
import { promisify } from 'util';
import config from '../config/app';

export class CacheService {
  private static instance: CacheService;
  private client: Redis;
  private defaultTTL = 3600; // 1小时

  private constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * 设置缓存
   */
  async set(
    key: string,
    value: any,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setex(key, ttl, serializedValue);
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache del error:', error);
      throw error;
    }
  }

  /**
   * 设置哈希表字段
   */
  async hset(
    key: string,
    field: string,
    value: any,
    ttl?: number
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.hset(key, field, serializedValue);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
    } catch (error) {
      console.error('Cache hset error:', error);
      throw error;
    }
  }

  /**
   * 获取哈希表字段
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache hget error:', error);
      return null;
    }
  }

  /**
   * 获取哈希表所有字段
   */
  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    try {
      const values = await this.client.hgetall(key);
      if (!values) return null;
      return Object.entries(values).reduce(
        (acc, [field, value]) => ({
          ...acc,
          [field]: JSON.parse(value),
        }),
        {}
      );
    } catch (error) {
      console.error('Cache hgetall error:', error);
      return null;
    }
  }

  /**
   * 删除哈希表字段
   */
  async hdel(key: string, field: string): Promise<void> {
    try {
      await this.client.hdel(key, field);
    } catch (error) {
      console.error('Cache hdel error:', error);
      throw error;
    }
  }

  /**
   * 设置列表
   */
  async lpush(
    key: string,
    values: any[],
    ttl?: number
  ): Promise<void> {
    try {
      const serializedValues = values.map((v) => JSON.stringify(v));
      await this.client.lpush(key, ...serializedValues);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
    } catch (error) {
      console.error('Cache lpush error:', error);
      throw error;
    }
  }

  /**
   * 获取列表范围
   */
  async lrange<T>(
    key: string,
    start: number,
    stop: number
  ): Promise<T[]> {
    try {
      const values = await this.client.lrange(key, start, stop);
      return values.map((v) => JSON.parse(v));
    } catch (error) {
      console.error('Cache lrange error:', error);
      return [];
    }
  }

  /**
   * 添加到有序集合
   */
  async zadd(
    key: string,
    score: number,
    member: string,
    ttl?: number
  ): Promise<void> {
    try {
      await this.client.zadd(key, score, member);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
    } catch (error) {
      console.error('Cache zadd error:', error);
      throw error;
    }
  }

  /**
   * 获取有序集合范围
   */
  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores = false
  ): Promise<string[] | Array<[string, number]>> {
    try {
      if (withScores) {
        const results = await this.client.zrange(key, start, stop, 'WITHSCORES');
        const pairs: Array<[string, number]> = [];
        for (let i = 0; i < results.length; i += 2) {
          pairs.push([results[i], parseFloat(results[i + 1])]);
        }
        return pairs;
      }
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      console.error('Cache zrange error:', error);
      return [];
    }
  }

  /**
   * 增加计数
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.client.incr(key);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error('Cache incr error:', error);
      throw error;
    }
  }

  /**
   * 设置位图
   */
  async setbit(key: string, offset: number, value: 0 | 1): Promise<void> {
    try {
      await this.client.setbit(key, offset, value);
    } catch (error) {
      console.error('Cache setbit error:', error);
      throw error;
    }
  }

  /**
   * 获取位图
   */
  async getbit(key: string, offset: number): Promise<number> {
    try {
      return await this.client.getbit(key, offset);
    } catch (error) {
      console.error('Cache getbit error:', error);
      return 0;
    }
  }

  /**
   * 清除所有缓存
   */
  async flush(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch (error) {
      console.error('Cache flush error:', error);
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}

export const cacheService = CacheService.getInstance();