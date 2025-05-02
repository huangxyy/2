/**
 * @swagger
 * tags:
 *   name: Files
 *   description: 文件上传相关接口
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: 上传单个文件
 *     tags: [Files]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 要上传的文件
 *               generateThumbnail:
 *                 type: boolean
 *                 description: 是否生成缩略图
 *               preserveExif:
 *                 type: boolean
 *                 description: 是否保留EXIF信息
 *               resize:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: integer
 *                     description: 目标宽度
 *                   height:
 *                     type: integer
 *                     description: 目标高度
 *                   fit:
 *                     type: string
 *                     enum: [cover, contain, fill, inside, outside]
 *                     description: 缩放方式
 *               compress:
 *                 type: object
 *                 properties:
 *                   quality:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 100
 *                     description: 压缩质量
 *                   lossless:
 *                     type: boolean
 *                     description: 无损压缩
 *     responses:
 *       201:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: 文件ID
 *                 url:
 *                   type: string
 *                   description: 文件URL
 *                 thumbnailUrl:
 *                   type: string
 *                   description: 缩略图URL
 *                 filename:
 *                   type: string
 *                   description: 文件名
 *                 size:
 *                   type: integer
 *                   description: 文件大小(字节)
 *                 width:
 *                   type: integer
 *                   description: 图片宽度
 *                 height:
 *                   type: integer
 *                   description: 图片高度
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 未登录
 */

// ... 更多路由注释