/** Response from `POST /api/auth/firebase-phone` after a successful Firebase ID token exchange. */
export type ExchangeFirebaseSessionResult = {
  token: string;
  user: Record<string, unknown>;
};
