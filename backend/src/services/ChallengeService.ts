import { db } from '../utils/database';
import { containerService } from './ContainerService';
import { Challenge, TestCase, Submission, TestResult } from '../models/Challenge';
import logger from '../utils/logger';

export class ChallengeService {
  /**
   * 创建挑战
   */
  async createChallenge(data: Omit<Challenge, 'id' | 'createdAt' | 'updatedAt'>): Promise<Challenge> {
    return await db.transaction(async (client) => {
      // 创建挑战
      const challengeResult = await client.query<Challenge>(
        `INSERT INTO challenges (
          title, description, difficulty, category,
          initial_code, docker_image, time_limit, memory_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          data.title,
          data.description,
          data.difficulty,
          data.category,
          data.initialCode,
          data.dockerImage,
          data.timeLimit,
          data.memoryLimit,
        ]
      );

      const challenge = challengeResult.rows[0];

      // 创建测试用例
      const testCases = await Promise.all(
        data.testCases.map((testCase, index) =>
          client.query<TestCase>(
            `INSERT INTO test_cases (
              challenge_id, input, expected_output,
              is_hidden, "order"
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
              challenge.id,
              testCase.input,
              testCase.expectedOutput,
              testCase.isHidden,
              index + 1,
            ]
          )
        )
      );

      challenge.testCases = testCases.map((result) => result.rows[0]);

      return challenge;
    });
  }

  /**
   * 提交代码
   */
  async submitCode(
    challengeId: number,
    userId: number,
    code: string,
    language: string
  ): Promise<Submission> {
    return await db.transaction(async (client) => {
      // 获取挑战信息
      const challenge = await this.getChallenge(challengeId);
      if (!challenge) {
        throw new Error('挑战不存在');
      }

      // 创建提交记录
      const submissionResult = await client.query<Submission>(
        `INSERT INTO submissions (
          challenge_id, user_id, code, language, status
        ) VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *`,
        [challengeId, userId, code, language]
      );

      const submission = submissionResult.rows[0];

      // 异步执行测试
      this.runTests(submission, challenge).catch((error) => {
        logger.error('Test execution failed:', error);
      });

      return submission;
    });
  }

  /**
   * 运行测试
   */
  private async runTests(submission: Submission, challenge: Challenge): Promise<void> {
    try {
      // 更新状态为运行中
      await db.query(
        `UPDATE submissions 
         SET status = 'running'
         WHERE id = $1`,
        [submission.id]
      );

      const results: TestResult[] = [];
      let totalTime = 0;
      let maxMemory = 0;

      // 运行每个测试用例
      for (const testCase of challenge.testCases) {
        try {
          const result = await containerService.createContainer({
            image: challenge.dockerImage,
            code: submission.code,
            language: submission.language,
            input: testCase.input,
            timeLimit: challenge.timeLimit,
            memoryLimit: challenge.memoryLimit,
          });

          const testResult: TestResult = {
            testCaseId: testCase.id,
            passed: result.output.trim() === testCase.expectedOutput.trim(),
            output: result.output,
            error: result.error,
            executionTime: result.executionTime,
            memoryUsage: result.memoryUsage,
          };

          results.push(testResult);
          totalTime += result.executionTime;
          maxMemory = Math.max(maxMemory, result.memoryUsage);

          if (result.containerId) {
            await containerService.removeContainer(result.containerId);
          }
        } catch (error) {
          results.push({
            testCaseId: testCase.id,
            passed: false,
            output: '',
            error: error.message,
            executionTime: 0,
            memoryUsage: 0,
          });
        }
      }

      // 更新提交结果
      await db.query(
        `UPDATE submissions
         SET status = 'completed',
             results = $1,
             execution_time = $2,
             memory_usage = $3
         WHERE id = $4`,
        [JSON.stringify(results), totalTime, maxMemory, submission.id]
      );
    } catch (error) {
      // 更新失败状态
      await db.query(
        `UPDATE submissions
         SET status = 'error',
             error = $1
         WHERE id = $2`,
        [error.message, submission.id]
      );
    }
  }

  /**
   * 获取挑战详情
   */
  async getChallenge(id: number): Promise<Challenge | null> {
    const result = await db.query<Challenge>(
      `SELECT c.*, array_agg(tc.*) as test_cases
       FROM challenges c
       LEFT JOIN test_cases tc ON c.id = tc.challenge_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * 获取提交状态
   */
  async getSubmission(id: number): Promise<Submission | null> {
    const result = await db.query<Submission>(
      'SELECT * FROM submissions WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }
}

export const challengeService = new ChallengeService();