import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import * as authService from '../services/auth.service';

const verifyKioskPasswordSchema = z.object({
  password: z.string().min(1),
});

const changeKioskPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4),
});

export const authRouter = Router();

// POST /api/auth/verify-kiosk-password
authRouter.post(
  '/verify-kiosk-password',
  validate(verifyKioskPasswordSchema),
  async (req, res, next) => {
    try {
      const { password } = req.body as z.infer<typeof verifyKioskPasswordSchema>;
      const result = await authService.verifyKioskPassword(password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/change-kiosk-password
authRouter.post(
  '/change-kiosk-password',
  validate(changeKioskPasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body as z.infer<
        typeof changeKioskPasswordSchema
      >;
      const result = await authService.changeKioskPassword(currentPassword, newPassword);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
