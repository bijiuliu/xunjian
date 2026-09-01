export type AuthMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password";

export type AuthScreenProps = {
  passwordRecovery?: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (
    email: string,
    password: string,
  ) => Promise<{
    needsEmailConfirmation: boolean;
    alreadyRegistered: boolean;
  }>;
  onResendSignUpConfirmation: (email: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<void>;
};
