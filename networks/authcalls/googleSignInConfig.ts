import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AUTH_CONFIG } from './authConfig';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: AUTH_CONFIG.GOOGLE_WEB_CLIENT_ID,
    iosClientId: AUTH_CONFIG.GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
};