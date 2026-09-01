import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccountNotice({
  email,
  resending,
  resendCooldown,
  formError,
  onResend,
  onSignIn,
}: {
  email: string;
  resending: boolean;
  resendCooldown: number;
  formError: string | null;
  onResend: () => void;
  onSignIn: () => void;
}) {
  return (
    <StatusPanel
      icon={<CircleCheck className="size-6" />}
      title="请验证邮箱"
      description={`验证邮件已发送至 ${email}。完成验证后即可登录。`}
    >
      {formError && (
        <p
          role="alert"
          className="mt-4 rounded-small bg-destructive-soft px-3 py-2 text-caption font-semibold text-destructive"
        >
          {formError}
        </p>
      )}
      <div className="mt-5 grid gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={resending || resendCooldown > 0}
          onClick={onResend}
          className="w-full"
        >
          {resending
            ? "正在发送…"
            : resendCooldown > 0
              ? `${resendCooldown} 秒后可重发`
              : "重新发送验证邮件"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onSignIn}
          className="w-full"
        >
          返回登录
        </Button>
      </div>
    </StatusPanel>
  );
}

export function StatusPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
        {icon}
      </div>
      <h2 className="mt-4 text-card-title font-bold">{title}</h2>
      <p className="mt-2 break-words text-body leading-6 text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}
