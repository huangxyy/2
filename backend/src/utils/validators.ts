import { body } from 'express-validator';

export const challengeValidation = {
  submitFlag: [
    body('flag')
      .notEmpty()
      .withMessage('Flag is required')
      .isString()
      .withMessage('Flag must be a string')
      .trim(),
  ],
};