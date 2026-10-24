export const ROLES = ["owner", "editor", "viewer"] as const;
export type RoleId = (typeof ROLES)[number];

export const ROLE_LABELS: Record<string, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer" };
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Manages members, workspace settings and deletion. Can do everything an editor can.",
  editor: "Adds offers, approves claims, writes and edits copy.",
  viewer: "Reads offers, ledgers and drafts. Cannot change anything.",
};
