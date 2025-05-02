import { Options } from 'swagger-jsdoc';

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Discussion API',
      version: '1.0.0',
      description: '讨论系统 API 文档',
      contact: {
        name: 'huangxyy',
        email: 'huangxyy@example.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: '开发环境',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: '错误信息',
            },
            errors: {
              type: 'object',
              description: '详细错误信息',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '用户ID',
            },
            username: {
              type: 'string',
              description: '用户名',
            },
            email: {
              type: 'string',
              description: '邮箱',
            },
            avatar: {
              type: 'string',
              description: '头像URL',
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin'],
              description: '用户角色',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
            },
          },
        },
        Discussion: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '讨论ID',
            },
            title: {
              type: 'string',
              description: '标题',
            },
            content: {
              type: 'string',
              description: '内容',
            },
            author: {
              $ref: '#/components/schemas/User',
            },
            category: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  description: '分类ID',
                },
                name: {
                  type: 'string',
                  description: '分类名称',
                },
                slug: {
                  type: 'string',
                  description: '分类别名',
                },
              },
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: '标签',
            },
            status: {
              type: 'string',
              enum: ['open', 'closed', 'locked'],
              description: '状态',
            },
            is_pinned: {
              type: 'boolean',
              description: '是否置顶',
            },
            views: {
              type: 'integer',
              description: '查看次数',
            },
            likes_count: {
              type: 'integer',
              description: '点赞数',
            },
            replies_count: {
              type: 'integer',
              description: '回复数',
            },
            is_liked: {
              type: 'boolean',
              description: '当前用户是否已点赞',
            },
            is_collected: {
              type: 'boolean',
              description: '当前用户是否已收藏',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间',
            },
          },
        },
        Reply: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '回复ID',
            },
            content: {
              type: 'string',
              description: '内容',
            },
            author: {
              $ref: '#/components/schemas/User',
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              description: '父回复ID',
            },
            likes_count: {
              type: 'integer',
              description: '点赞数',
            },
            is_liked: {
              type: 'boolean',
              description: '当前用户是否已点赞',
            },
            is_edited: {
              type: 'boolean',
              description: '是否已编辑',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间',
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export default swaggerOptions;