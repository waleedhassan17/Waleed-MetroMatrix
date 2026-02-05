// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase config from metromatrix-c44c6 project
const firebaseConfig = {
  apiKey: "AIzaSyAmIk-MngvpR0lLuu-FEML60qdIiRNPXpY",
  authDomain: "metromatrix-c44c6.firebaseapp.com",
  projectId: "metromatrix-c44c6",
  storageBucket: "metromatrix-c44c6.firebasestorage.app",
  messagingSenderId: "942315940095",
  appId: "1:942315940095:android:b39a34e5f836c9460204ca"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
