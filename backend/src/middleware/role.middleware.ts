import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'

export const requireRole = (role: 'mentor' | 'student') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (req.user.role !== role) {
      res.status(403).json({ error: `Only ${role}s can access this route` })
      return
    }

    next()
  }
}