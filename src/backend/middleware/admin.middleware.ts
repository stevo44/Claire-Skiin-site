import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.ts';
import pool from '../config/db.ts';

export interface PermissionRequest extends AuthRequest {
  userPermissions?: string[];
}

/**
 * @desc Require permission middleware factory.
 *       Reads req.user.id and verifies the user has the required permission.
 *       Caches the lookup in req.userPermissions to avoid repeated queries in the request life cycle.
 */
export const requirePermission = (permissionKey: string) => {
  return async (
    req: PermissionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized: No user session found.' });
      return;
    }

    try {
      // Cache-hit
      if (!req.userPermissions) {
        const query = `
          SELECT p.key 
          FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          JOIN users u ON u.role_id = rp.role_id
          WHERE u.id = $1
        `;
        const result = await pool.query(query, [req.user.id]);
        req.userPermissions = result.rows.map((row: any) => row.key);
      }

      if (!req.userPermissions.includes(permissionKey)) {
        res.status(403).json({ 
          message: `Forbidden: You do not have the required permission (${permissionKey}) to access this resource.` 
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * @desc Legacy fallback to support isAdmin. Uses the requirePermission factory.
 */
export const isAdmin = requirePermission('users:manage');

