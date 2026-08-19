import { Request, Response, NextFunction } from 'express';

/**
 * @desc Simple XSS protection middleware to sanitize request body
 */
export const xssSanitize = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<[^>]*>?/gm, '');
      }
    }
  }
  next();
};
