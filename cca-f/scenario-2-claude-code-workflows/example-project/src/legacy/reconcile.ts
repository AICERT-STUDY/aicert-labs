// No test coverage. Three other services poll the output of reconcileLedger()
// and depend on its current (undocumented) rounding behavior — this is the
// file CLAUDE.md means by "src/legacy/: plan mode required, always."
// Do not "clean this up" without a plan that names what you couldn't verify.
export function reconcileLedger(entries: number[]): number {
  return entries.reduce((sum, n) => sum + Math.round(n * 100) / 100, 0);
}
