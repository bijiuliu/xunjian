export type AuthOperation =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password"
  | "resend-confirmation";

export function getAuthErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

export function getAuthErrorMessage(
  error: unknown,
  operation: AuthOperation,
) {
  const code = getAuthErrorCode(error);

  switch (code) {
    case "invalid_credentials":
      return "邮箱或密码不正确";
    case "email_not_confirmed":
      return "邮箱尚未验证，请先完成邮箱验证";
    case "user_already_exists":
    case "email_exists":
      return "该邮箱已注册";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "操作过于频繁，请稍后再试";
    case "weak_password":
      return "密码不符合安全要求，请换一个更强的密码";
    case "same_password":
      return "新密码不能与原密码相同";
    case "session_not_found":
    case "session_expired":
    case "otp_expired":
      return "重置链接无效或已过期，请重新发送";
    case "email_address_invalid":
      return "请输入有效的邮箱地址";
    case "signup_disabled":
      return "暂时无法注册新账号";
  }

  if (operation === "forgot-password") return "重置邮件发送失败，请稍后重试";
  if (operation === "reset-password") return "密码更新失败，请重新打开重置链接";
  if (operation === "resend-confirmation") return "验证邮件发送失败，请稍后重试";
  return operation === "sign-in" ? "登录失败，请稍后重试" : "注册失败，请稍后重试";
}
