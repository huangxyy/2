import { db } from '../utils/database';
import { cacheService } from '../services/CacheService';
import { searchService } from '../services/SearchService';

beforeAll(async () => {
  // 连接测试数据库
  await db.query('SELECT 1');
  
  // 清空缓存
  await cacheService.flush();
  
  // 创建测试索引
  await searchService.createTestIndices();
});

afterAll(async () => {
  // 关闭数据库连接
  await db.end();
  
  // 关闭缓存连接
  await cacheService.close();
  
  // 删除测试索引
  await searchService.deleteTestIndices();
});

afterEach(async () => {
  // 清理测试数据
  await db.query('DELETE FROM discussions');
  await db.query('DELETE FROM users');
  
  // 清空缓存
  await cacheService.flush();
});