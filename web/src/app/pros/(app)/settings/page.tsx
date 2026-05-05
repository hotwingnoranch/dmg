import Link from "next/link";

export default function ProSettingsPage() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="display-h2 mt-2">Profile & lead preferences</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-300">
          A full settings UI is on its way. In the meantime, you can re-run the
          onboarding flow to update your services, service area, and team
          details.
        </p>
      </div>

      <div className="card p-6">
        <p className="font-display text-xl font-bold">Quick actions</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/pros/join" className="btn-primary">
            Re-run onboarding
          </Link>
          <Link href="/" className="btn-outline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
