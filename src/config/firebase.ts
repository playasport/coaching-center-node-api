import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { logger } from '../utils/logger';

interface FirebaseCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

const credentialPaths = [
  path.resolve(process.cwd(), 'firebase-credentials.json'),
  path.resolve(process.cwd(), 'src', 'config', 'firebase-credentials.json'),
];

let cachedAuth: Auth | null = null;
let cachedCredentials: FirebaseCredentials | null = null;

const locateCredentialsFile = (): string | null => {
  for (const candidate of credentialPaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const loadCredentials = (): FirebaseCredentials => {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const credentialsPath = locateCredentialsFile();

  if (!credentialsPath) {
    throw new Error(
      `Firebase credentials file not found. Provide it at one of the following locations:\n${credentialPaths
        .map((p) => ` - ${p}`)
        .join('\n')}`
    );
  }

  try {
    const raw = fs.readFileSync(credentialsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const projectId = parsed.projectId || parsed.project_id;
    const clientEmail = parsed.clientEmail || parsed.client_email;
    const privateKey = parsed.privateKey || parsed.private_key;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase credentials file is missing required fields (projectId/clientEmail/privateKey).'
      );
    }

    cachedCredentials = {
      projectId,
      clientEmail,
      privateKey: String(privateKey).replace(/\\n/g, '\n'),
    };

    return cachedCredentials;
  } catch (error) {
    logger.error('Failed to read Firebase credentials file', error);
    throw error;
  }
};

export const getFirebaseAuth = (): Auth => {
  if (cachedAuth) {
    return cachedAuth;
  }

  const credentials = loadCredentials();

  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert({
          projectId: credentials.projectId,
          clientEmail: credentials.clientEmail,
          privateKey: credentials.privateKey,
        }),
      });
      logger.info('Firebase app initialized');
    } catch (error) {
      logger.error('Failed to initialize Firebase app', error);
      throw error;
    }
  }

  cachedAuth = getAuth();
  return cachedAuth;
};

