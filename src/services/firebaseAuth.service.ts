import { DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAuth } from '../config/firebase';

export const firebaseAuthService = {
  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    const auth = getFirebaseAuth();
    return auth.verifyIdToken(idToken, true);
  },
};

