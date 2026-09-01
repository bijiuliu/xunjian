import type { InspectionTab } from "@/features/inspection/model/types";

export type AccountDialogProps = {
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  avatarBusy: boolean;
  navigationOrder: InspectionTab[];
  onAvatarChange: (file: File) => Promise<void>;
  onAvatarRemove: () => Promise<void>;
  onNavigationOrderChange: (order: InspectionTab[]) => Promise<void>;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  onSignOut: () => Promise<void>;
  onClose: () => void;
};

export type ConfirmationAction = "remove-avatar" | "sign-out";
