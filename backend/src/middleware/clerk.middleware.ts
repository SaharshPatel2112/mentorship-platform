import { Request, Response, NextFunction } from 'express'
import { createClerkClient, verifyToken } from '@clerk/backend'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
})

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
}

export const verifyClerkToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })

    req.userId = payload.sub

    const user = await clerk.users.getUser(payload.sub)
    req.userRole = (user.unsafeMetadata?.role as string) || 'student'

    next()
  } catch (error) {
    console.error('Token verification error:', error)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}