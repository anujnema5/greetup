/** Response from `POST /api/auth/phone-otp/verify` after a successful sign-in/sign-up. */
export type PhoneOtpSessionResult = {
  token: string;
  user: Record<string, unknown>;
};
