import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForFallbackSetup12345",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "autorescue-pakistan.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "autorescue-pakistan",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "autorescue-pakistan.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456"
};

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

/**
 * Format any entered Pakistani phone number into standard international E.164 format (+923001234567)
 */
export function formatPakistaniPhoneNumber(input) {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('92')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0')) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+92${digits}`;
  }
  return `+${digits}`;
}

/**
 * Setup reCAPTCHA verifier for phone authentication (required by cellular telecom networks)
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (typeof window === 'undefined') return null;

  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn('reCAPTCHA reset:', e);
    }
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - will proceed with real SMS submit
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired. Please try again.');
    }
  });

  return window.recaptchaVerifier;
}

/**
 * Send real SMS verification OTP to a physical mobile phone number
 */
export async function sendRealSMSOTP(rawPhoneNumber, containerId = 'recaptcha-container') {
  const formattedNumber = formatPakistaniPhoneNumber(rawPhoneNumber);
  
  if (formattedNumber.length < 12) {
    throw new Error('Please enter a valid Pakistani mobile number (e.g. 0300-1234567)');
  }

  const verifier = setupRecaptcha(containerId);
  const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, verifier);
  window.confirmationResult = confirmationResult;
  return { confirmationResult, formattedNumber };
}

/**
 * Verify the 6-digit SMS OTP received on the physical mobile phone
 */
export async function verifyRealSMSOTP(confirmationResult, otpCode) {
  if (!confirmationResult && window.confirmationResult) {
    confirmationResult = window.confirmationResult;
  }
  if (!confirmationResult) {
    throw new Error('No SMS verification session found. Please request a new SMS OTP.');
  }

  const userCredential = await confirmationResult.confirm(otpCode);
  return userCredential.user;
}
