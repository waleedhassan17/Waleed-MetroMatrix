// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Replace with YOUR Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDvqVqqmf5Nwz7dkbQXwtQF5N5-bVHH5ac",
  authDomain: "auth-test-dummy.firebaseapp.com",
  projectId: "auth-test-dummy",
  storageBucket: "auth-test-dummy.firebasestorage.app",
  messagingSenderId: "241889899830",
  appId: "1:241889899830:web:1a925a35f199b5fe116f97"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);