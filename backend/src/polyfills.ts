// Polyfill for crypto to fix @nestjs/schedule compatibility with Node.js 18
// This must be imported FIRST before any other modules

import * as crypto from 'crypto';

// Ensure crypto is available globally
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = crypto;
}

// Ensure randomUUID is available
if (typeof (globalThis as any).crypto.randomUUID === 'undefined') {
  (globalThis as any).crypto.randomUUID = () => crypto.randomUUID();
}

export {};

