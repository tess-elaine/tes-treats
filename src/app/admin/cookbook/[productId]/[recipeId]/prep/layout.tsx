// Prep sheet gets its own minimal wrapper so it's print-friendly.
// The admin sidebar is still rendered (from the parent layout.tsx) but the
// print stylesheet hides it via the `.no-print` class added by PrepSheetClient.
export default function PrepSheetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
