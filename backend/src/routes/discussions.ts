/**
 * @swagger
 * tags:
 *   name: Discussions
 *   description: 讨论相关接口
 */

/**
 * @swagger
 * /api/discussions:
 *   get:
 *     summary: 获取讨论列表
 *     tags: [Discussions]
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: 分类ID
 *       - in: query
 *         name: author_id
 *         schema:
 *           type: integer
 *         description: 作者ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed, locked]
 *         description: 状态
 *       - in: query
 *         name: is_pinned
 *         schema:
 *           type: boolean
 *         description: 是否置顶
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: 标签
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [latest, popular, unanswered]
 *         description: 排序方式
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discussion'
 *                 total:
 *                   type: integer
 *                   description: 总数
 *                 page:
 *                   type: integer
 *                   description: 当前页码
 *                 pageSize:
 *                   type: integer
 *                   description: 每页数量
 *                 totalPages:
 *                   type: integer
 *                   description: 总页数
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/discussions:
 *   post:
 *     summary: 创建讨论
 *     tags: [Discussions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 description: 标题
 *               content:
 *                 type: string
 *                 minLength: 20
 *                 description: 内容
 *               category_id:
 *                 type: integer
 *                 description: 分类ID
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 标签
 *               is_pinned:
 *                 type: boolean
 *                 description: 是否置顶
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Discussion'
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未登录
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// ... 更多路由注释