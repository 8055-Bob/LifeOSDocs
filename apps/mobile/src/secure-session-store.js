import * as SecureStore from 'expo-secure-store';
import { createSessionStore } from './session-store.js';

export const secureSessionStore = createSessionStore(SecureStore);
