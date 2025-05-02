/**
 * @swagger
 * tags:
 *   name: Search
 *   description: 搜索相关接口
 */

/**
 * @swagger
 * /api/search/discussions:
 *   get:
 *     summary: 搜索讨论
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类名称
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: 作者用户名
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: 标签列表
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 搜索成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: 总数
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discussion'
 *                 aggregations:
 *                   type: object
 *                   description: 聚合结果
 */

// ... 更多路由注释