import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDR0ZrvsGGP_nVy0-nyqoRmouNbm8UbX8g",
  authDomain: "metromatrix-31f9f.firebaseapp.com",
  projectId: "metromatrix-31f9f",
  storageBucket: "metromatrix-31f9f.firebasestorage.app",
  messagingSenderId: "1007229712045",
  appId: "1:1007229712045:web:87aba36a12808670d87824",
  measurementId: "G-S8VTDKBZF1"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
