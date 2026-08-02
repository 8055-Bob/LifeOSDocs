import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createUserProfile } from '@lifeos/contracts';

const deriveKey = promisify(scrypt);

export class EmailPasswordAuthenticator {
  #credentials = new Map();

  async register({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    validatePassword(password);

    if (this.#credentials.has(normalizedEmail)) {
      throw new Error('Email is already registered');
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    const profile = createUserProfile({ id: `user_${randomUUID()}`, email: normalizedEmail });

    this.#credentials.set(normalizedEmail, { profile, salt, passwordHash });
    return profile;
  }

  async authenticate({ email, password }) {
    const credential = this.#credentials.get(email.trim().toLowerCase());

    if (!credential || !(await passwordsMatch(password, credential))) {
      throw new Error('Invalid email or password');
    }

    return credential.profile;
  }
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Password must contain at least 12 characters');
  }
}

async function hashPassword(password, salt) {
  const key = await deriveKey(password, salt, 64);
  return key.toString('hex');
}

async function passwordsMatch(password, credential) {
  if (typeof password !== 'string') {
    return false;
  }

  const received = Buffer.from(await hashPassword(password, credential.salt), 'hex');
  const expected = Buffer.from(credential.passwordHash, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
