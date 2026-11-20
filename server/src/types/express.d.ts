import type { Role } from '../models/User.js';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      name: string;
      email: string;
      roles: Role[];
    }
    interface Request {
      user?: AuthUser;
      valid: { body?: any; query?: any; params?: any };
    }
  }
}
export {};
