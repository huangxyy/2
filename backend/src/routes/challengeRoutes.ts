import { Router } from 'express';
import { ChallengeController } from '../controllers/ChallengeController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { challengeValidation } from '../utils/validators';

const router = Router();
const challengeController = new ChallengeController();

// 认证中间件
router.use(authMiddleware);

// 挑战列表
router.get(
  '/challenges',
  challengeController.listChallenges.bind(challengeController)
);

// 获取单个挑战
router.get(
  '/challenges/:id',
  challengeController.getChallenge.bind(challengeController)
);

// 开始挑战
router.post(
  '/challenges/:id/start',
  challengeController.startChallenge.bind(challengeController)
);

// 提交flag
router.post(
  '/challenges/:id/submit',
  validateRequest(challengeValidation.submitFlag),
  challengeController.submitFlag.bind(challengeController)
);

export default router;