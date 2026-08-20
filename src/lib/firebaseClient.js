import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Your live Firebase configuration for AutoRescue Pakistan
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDH_b0M2hR13V4aUij8AIZy8JrZm8jt4wU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "autorescue-74c40.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "autorescue-74c40",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "autorescue-74c40.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "437567694106",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:437567694106:web:7d82a357e12a9185fe38a3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TE958K18TK"
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
 * Setup reCAPTCHA verifier for phone authentication
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (typeof window === 'undefined') return null;

  try {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        // ignore clear error
      }
      window.recaptchaVerifier = null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`reCAPTCHA container element #${containerId} not found.`);
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired. Please retry.');
      }
    });

    return window.recaptchaVerifier;
  } catch (err) {
    console.error('Error creating RecaptchaVerifier:', err);
    throw err;
  }
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
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, verifier);
    window.confirmationResult = confirmationResult;
    return { confirmationResult, formattedNumber };
  } catch (err) {
    console.error('Firebase signInWithPhoneNumber failed:', err);
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    throw err;
  }
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
