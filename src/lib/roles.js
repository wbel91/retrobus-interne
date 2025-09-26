export const CREATOR_WHITELIST = ["w.belaidi", "admin"];

export function canCreate(matricule) {
  if (!matricule) return false;
  return CREATOR_WHITELIST.includes(String(matricule).toLowerCase());
}
