import { sequelize } from '../src/config/database';

beforeAll(async () => {
  // 连接测试数据库
  await sequelize.authenticate();
  
  // 同步数据库结构
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // 关闭数据库连接
  await sequelize.close();
});

// 每个测试后清理数据
afterEach(async () => {
  await Promise.all(
    Object.values(sequelize.models).map(model => model.destroy({ truncate: true }))
  );
});