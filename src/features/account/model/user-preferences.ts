import type { InspectionTab } from "@/features/inspection/model/types";

export const DEFAULT_NAVIGATION_ORDER: InspectionTab[] = [
  "slag8",
  "belt",
  "slag9",
  "history",
];

export type UserPreferences = {
  navigationOrder: InspectionTab[];
  avatarPath: string | null;
  updatedAt: string;
};

export function isNavigationOrder(value: unknown): value is InspectionTab[] {
  if (!Array.isArray(value) || value.length !== DEFAULT_NAVIGATION_ORDER.length) {
    return false;
  }
  return DEFAULT_NAVIGATION_ORDER.every((tab) => value.includes(tab));
}

export function createDefaultPreferences(): UserPreferences {
  return {
    navigationOrder: [...DEFAULT_NAVIGATION_ORDER],
    avatarPath: null,
    updatedAt: new Date(0).toISOString(),
  };
}
