## 启动服务

1. 启动所有服务
```bash
cd deployment
docker-compose -f docker-compose.prod.yml up -d
```

2. 执行数据库迁移
```bash
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

3. 创建管理员用户
```bash
docker-compose -f docker-compose.prod.yml exec backend npm run create-admin
```

## 验证部署

1. 检查服务状态
```bash
docker-compose -f docker-compose.prod.yml ps
```

2. 检查日志
```bash
# 检查前端日志
docker-compose -f docker-compose.prod.yml logs frontend

# 检查后端日志
docker-compose -f docker-compose.prod.yml logs backend
```

3. 访问服务
- 前端: https://your-domain.com
- API: https://your-domain.com/api
- Grafana: https://your-domain.com/grafana

## 故障排除

### 1. 服务无法启动
检查日志:
```bash
docker-compose -f docker-compose.prod.yml logs [service_name]
```

常见问题：
- 端口冲突
- 环境变量配置错误
- 数据库连接失败
- Docker权限问题

### 2. 数据库连接失败
检查：
- 数据库服务是否运行
- 数据库凭据是否正确
- 网络连接是否正常

### 3. WebSocket连接失败
检查：
- Nginx配置是否正确
- 防火墙设置
- SSL证书配置

### 4. Docker容器管理问题
检查：
- Docker socket权限
- Docker网络配置
- 资源限制设置

## 备份和恢复

### 数据库备份
```bash
# 创建备份
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U ${DB_USER} ${DB_NAME} > backup.sql

# 恢复备份
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ${DB_USER} ${DB_NAME}
```

### 配置备份
重要的配置文件和密钥：
- production.env
- jwt_secret.key
- cookie_secret.key
- SSL证书
- Nginx配置

## 安全建议

1. 文件权限
```bash
# 设置适当的文件权限
chmod 600 jwt_secret.key cookie_secret.key
chmod 600 production.env
```

2. 网络安全
- 使用防火墙限制端口访问
- 启用 HTTPS
- 配置安全标头

3. 容器安全
- 定期更新基础镜像
- 限制容器资源使用
- 使用非特权用户运行容器

4. 监控告警
- 设置资源使用告警
- 配置错误日志告警
- 监控异常访问模式