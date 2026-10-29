/**
 * "1 dishwasher", "3 dishwashers", "1 parking marshal". Roles are stored in the
 * plural ("servers", "parking marshals") except "supervisor"; this reads a role
 * correctly for any count.
 */
export function roleCount(n: number, role: string): string {
  role = role.trim();
  if (!role) return String(n);
  const singular = role.endsWith('s') ? role.slice(0, -1) : role;
  const plural = role.endsWith('s') ? role : `${role}s`;
  return `${n} ${n === 1 ? singular : plural}`;
}
