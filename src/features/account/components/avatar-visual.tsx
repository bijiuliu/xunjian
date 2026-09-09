import { UserRound } from "lucide-react";

export function AvatarVisual({
  email,
  avatarUrl,
  tone = "default",
}: {
  email: string;
  avatarUrl: string | null;
  tone?: "default" | "header";
}) {
  if (avatarUrl) {
    return (
      <span
        role="img"
        aria-label="用户头像"
        className="block size-full rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${JSON.stringify(avatarUrl)})` }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={`${email}的默认头像`}
      className={`grid size-full place-items-center rounded-full text-muted-foreground ${tone === "header" ? "bg-border" : "bg-muted"}`}
    >
      <UserRound className="size-1/2" />
    </span>
  );
}
