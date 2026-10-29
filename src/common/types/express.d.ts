import { HUserDocument } from '../../DB/models/user.model.ts';

declare global {
  namespace Express {
    interface Request {
      user?: HUserDocument;
    }
  }
}

export {};
