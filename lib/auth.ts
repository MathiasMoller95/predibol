import { SUPER_ADMIN_ID } from "./constants";

export function isSuperAdmin(userId: string): boolean {
  return userId === SUPER_ADMIN_ID;
}
