export type AuthFieldErrors = Partial<
  Record<"email" | "password" | "confirmPassword", string>
>;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return "请输入邮箱";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "请输入有效的邮箱地址";
  }
  return null;
}

export function validatePassword(password: string) {
  if (!password) return "请输入密码";
  if (password.length < 8) return "密码至少需要 8 位";
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
) {
  if (!confirmPassword) return "请再次输入密码";
  if (password !== confirmPassword) return "两次输入的密码不一致";
  return null;
}
