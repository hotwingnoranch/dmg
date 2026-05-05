/**
 * Credit cost for responding to a lead. Pure helper — kept outside the
 * "use server" actions file because server-action modules can only export
 * async functions.
 */
export function leadCost(urgency: string): number {
  if (urgency === "urgent") return 25;
  if (urgency === "soon") return 18;
  return 12;
}
