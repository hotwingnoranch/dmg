import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ImagePlus,
  PlayCircle,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import {
  uploadDocumentAction,
  deleteDocumentAction,
  removeAvatarAction,
  uploadProMediaAction,
  deleteProMediaAction,
} from "./actions";
import { AvatarCropper } from "./AvatarCropper";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

type MediaRow = {
  id: string;
  url: string;
  caption: string | null;
  media_kind: "image" | "video";
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
};

const AVATAR_MSG: Record<string, { tone: "ok" | "err"; text: string }> = {
  uploaded: { tone: "ok", text: "Profile photo updated." },
  removed: { tone: "ok", text: "Photo removed — using your initial again." },
  missing_file: { tone: "err", text: "Pick an image to upload." },
  too_large: { tone: "err", text: "Image too large. Max 5 MB." },
  bad_type: { tone: "err", text: "Only image files (JPG, PNG, WebP) are accepted." },
  upload_failed: { tone: "err", text: "Upload failed — try a smaller image." },
  db_failed: { tone: "err", text: "Saved the file but failed to record it. Contact support." },
};

const MEDIA_MSG: Record<string, { tone: "ok" | "err"; text: string }> = {
  uploaded: { tone: "ok", text: "Media added to your gallery." },
  deleted: { tone: "ok", text: "Removed from gallery." },
  missing_file: { tone: "err", text: "Pick a file before uploading." },
  bad_type: { tone: "err", text: "Use an image or video file." },
  image_too_large: { tone: "err", text: "Image too large. Max 12 MB." },
  video_too_large: { tone: "err", text: "Video too large. Max 80 MB." },
  upload_failed: { tone: "err", text: "Upload failed — try a smaller file." },
  db_failed: { tone: "err", text: "File uploaded but record failed. Contact support." },
  missing_id: { tone: "err", text: "Missing media reference." },
  not_found: { tone: "err", text: "Media not found." },
  delete_failed: { tone: "err", text: "Could not remove that file." },
};

type DocRow = {
  id: string;
  kind: "license" | "insurance" | "coi" | "certification" | "other";
  file_name: string;
  mime: string | null;
  size_bytes: number | null;
  expires_at: string | null;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  created_at: string;
};

const KIND_LABEL: Record<DocRow["kind"], string> = {
  license: "License",
  insurance: "Insurance",
  coi: "Certificate of Insurance (COI)",
  certification: "Certification",
  other: "Other",
};

const DOC_MSG: Record<string, { tone: "ok" | "err"; text: string }> = {
  uploaded: {
    tone: "ok",
    text: "Document uploaded. Our team will review it within 1–2 business days.",
  },
  deleted: { tone: "ok", text: "Document removed." },
  missing_file: { tone: "err", text: "Please choose a file before uploading." },
  invalid_kind: { tone: "err", text: "Pick a valid document type." },
  too_large: {
    tone: "err",
    text: "File is too large. Max 20 MB.",
  },
  bad_type: {
    tone: "err",
    text: "Only PDF and image files (JPG, PNG) are accepted.",
  },
  bad_expiry: { tone: "err", text: "Expiration date couldn't be read." },
  upload_failed: {
    tone: "err",
    text: "Upload failed. Try again or use a smaller file.",
  },
  db_failed: { tone: "err", text: "Saved the file but failed to record it. Contact support." },
  delete_failed: { tone: "err", text: "Could not delete that document." },
  missing_id: { tone: "err", text: "Missing document reference." },
  not_found: { tone: "err", text: "Document not found." },
};

function formatBytes(n: number | null) {
  if (!n || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

function StatusPill({ status }: { status: DocRow["status"] }) {
  const map = {
    verified: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      cls: "border-emerald-400 bg-emerald-100 text-emerald-900",
      label: "Verified",
    },
    pending: {
      icon: <Clock className="h-3.5 w-3.5" />,
      cls: "border-amber-accent/30 bg-amber-accent/10 text-amber-accent",
      label: "Pending review",
    },
    rejected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      cls: "border-red-400 bg-red-100 text-red-900",
      label: "Rejected",
    },
  } as const;
  const m = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${m.cls}`}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

export default async function ProSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    doc_msg?: string;
    avatar_msg?: string;
    media_msg?: string;
  }>;
}) {
  const user = await requireUser("/pros/settings");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const params = await searchParams;
  const msg = params.doc_msg ? DOC_MSG[params.doc_msg] : null;
  const avatarMsg = params.avatar_msg ? AVATAR_MSG[params.avatar_msg] : null;
  const mediaMsg = params.media_msg ? MEDIA_MSG[params.media_msg] : null;

  const [docsRes, proRes, profileRes, mediaRes] = await Promise.all([
    insforge.database
      .from("pro_documents")
      .select(
        "id, kind, file_name, mime, size_bytes, expires_at, status, notes, created_at"
      )
      .eq("pro_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    insforge.database
      .from("pros")
      .select("license_verified, insurance_verified")
      .eq("id", user.id)
      .maybeSingle(),
    insforge.database
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    insforge.database
      .from("pro_photos")
      .select(
        "id, url, caption, media_kind, mime, size_bytes, created_at"
      )
      .eq("pro_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const docs = (docsRes.data ?? []) as DocRow[];
  const pro = (proRes.data ?? null) as
    | { license_verified: boolean; insurance_verified: boolean }
    | null;
  const profile = (profileRes.data ?? null) as ProfileRow | null;
  const media = (mediaRes.data ?? []) as MediaRow[];

  const now = Date.now();
  const expiringSoon = docs.filter(
    (d) =>
      d.status === "verified" &&
      d.expires_at &&
      new Date(d.expires_at).getTime() - now < 30 * 24 * 60 * 60 * 1000 &&
      new Date(d.expires_at).getTime() > now
  );

  return (
    <div className="grid gap-8">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="display-h2 mt-2">Profile &amp; documents</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-300">
          Upload your license, insurance, and certifications. Verified
          documents unlock the&nbsp;
          <span className="inline-flex items-center gap-1 font-medium text-emerald-900">
            <ShieldCheck className="h-3.5 w-3.5" /> verified
          </span>
          &nbsp;badge on your public profile and help you win more leads.
        </p>
      </div>

      {msg && <Banner tone={msg.tone} text={msg.text} />}
      {avatarMsg && <Banner tone={avatarMsg.tone} text={avatarMsg.text} />}
      {mediaMsg && <Banner tone={mediaMsg.tone} text={mediaMsg.text} />}

      {/* Avatar / company logo */}
      <section className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xl font-bold">
              Profile photo &amp; company logo
            </p>
            <p className="mt-1 text-sm text-ink-300">
              Square image, JPG / PNG / WebP up to 5 MB. Shown next to your
              name across Vanguard.
            </p>
          </div>
          <div className="relative grid h-20 w-20 flex-none place-items-center overflow-hidden rounded-full bg-amber-accent/15 ring-1 ring-amber-accent/30">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <UserRound className="h-7 w-7 text-amber-accent" />
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <AvatarCropper />
          {profile?.avatar_url && (
            <form action={removeAvatarAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-white px-3 py-1.5 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-900"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove current photo
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Past-job gallery (images + videos) */}
      <section className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xl font-bold">
              Past jobs &amp; portfolio
            </p>
            <p className="mt-1 text-sm text-ink-300">
              Show clients the work. Images up to 12 MB, videos up to 80 MB.
              Posted to your public profile.
            </p>
          </div>
          <span className="text-xs text-ink-400">{media.length} item{media.length === 1 ? "" : "s"}</span>
        </div>

        <form
          action={uploadProMediaAction}
          encType="multipart/form-data"
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="grid gap-2">
            <span className="label">Image or video</span>
            <input
              type="file"
              name="file"
              required
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              className="block w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-ink-100 file:mr-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-navy-700"
            />
          </label>
          <label className="grid gap-2">
            <span className="label">Caption (optional)</span>
            <input
              type="text"
              name="caption"
              maxLength={140}
              placeholder="e.g. Concert event security · Brooklyn"
              className="input"
            />
          </label>
          <button type="submit" className="btn-primary">
            <ImagePlus className="h-4 w-4" />
            Upload
          </button>
        </form>

        {media.length === 0 ? (
          <p className="mt-6 text-sm text-ink-400">
            No items yet. Add a few to make your profile stand out.
          </p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((m) => (
              <li
                key={m.id}
                className="card-elev overflow-hidden"
              >
                <div className="relative aspect-video bg-ink-900">
                  {m.media_kind === "video" ? (
                    <video
                      src={m.url}
                      className="h-full w-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <Image
                      src={m.url}
                      alt={m.caption ?? ""}
                      fill
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      className="object-cover"
                    />
                  )}
                  <span
                    className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      m.media_kind === "video"
                        ? "border-amber-accent bg-white/95 text-amber-accent"
                        : "border-ink-600 bg-white/95 text-ink-300"
                    }`}
                  >
                    {m.media_kind === "video" ? (
                      <PlayCircle className="h-3 w-3" />
                    ) : null}
                    {m.media_kind}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {m.caption ?? <span className="text-ink-400">No caption</span>}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatBytes(m.size_bytes)} · {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={deleteProMediaAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-ink-600 p-1.5 text-ink-300 hover:border-red-500/40 hover:text-red-900"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Verification summary */}
      <section className="grid gap-4 sm:grid-cols-2">
        <VerificationCard
          label="License"
          verified={pro?.license_verified ?? false}
          hint={
            pro?.license_verified
              ? "On file and verified."
              : "Upload a copy of your security license."
          }
        />
        <VerificationCard
          label="Insurance / COI"
          verified={pro?.insurance_verified ?? false}
          hint={
            pro?.insurance_verified
              ? "On file and verified."
              : "Upload your COI or general liability proof."
          }
        />
      </section>

      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-accent/40 bg-amber-accent/5 px-4 py-3 text-sm text-ink-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-accent" />
          <div>
            <p className="font-medium">
              {expiringSoon.length}{" "}
              {expiringSoon.length === 1 ? "document expires" : "documents expire"} within 30 days.
            </p>
            <p className="text-xs text-ink-300">
              Re-upload before the expiry date to keep your verified badge.
            </p>
          </div>
        </div>
      )}

      {/* Upload form */}
      <section className="card p-6">
        <p className="font-display text-xl font-bold">Upload a document</p>
        <p className="mt-1 text-sm text-ink-300">
          PDF or image up to 20 MB. We&apos;ll review within 1–2 business days.
        </p>

        <form
          action={uploadDocumentAction}
          encType="multipart/form-data"
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <label className="grid gap-2">
            <span className="label">Document type</span>
            <select name="kind" required className="input" defaultValue="license">
              {Object.entries(KIND_LABEL).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="label">Expires (optional)</span>
            <input type="date" name="expires_at" className="input" />
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="label">File</span>
            <input
              type="file"
              name="file"
              required
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="block w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-ink-100 file:mr-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-navy-700"
            />
          </label>

          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              <Upload className="h-4 w-4" />
              Upload document
            </button>
          </div>
        </form>
      </section>

      {/* Documents list */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl font-bold">Your documents</p>
          <span className="text-xs text-ink-400">{docs.length} on file</span>
        </div>

        {docs.length === 0 ? (
          <p className="mt-6 text-sm text-ink-400">
            No documents uploaded yet.
          </p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink-700 bg-white p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ink-900 text-amber-accent">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.file_name}</p>
                    <p className="text-xs text-ink-300">
                      {KIND_LABEL[d.kind]} · {formatBytes(d.size_bytes)} ·
                      uploaded{" "}
                      {new Date(d.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {d.expires_at && (
                        <>
                          {" · expires "}
                          {new Date(d.expires_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </>
                      )}
                    </p>
                    {d.status === "rejected" && d.notes && (
                      <p className="mt-1 text-xs text-red-900">
                        Reviewer note: {d.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusPill status={d.status} />
                  <form action={deleteDocumentAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 px-3 py-1.5 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-900"
                      aria-label={`Delete ${d.file_name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <p className="font-display text-xl font-bold">Other settings</p>
        <p className="mt-1 text-sm text-ink-300">
          Need to update your services, service area, or team details?
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/pros/join" className="btn-outline">
            Re-run onboarding
          </Link>
          <Link href="/" className="btn-ghost">
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}

function Banner({ tone, text }: { tone: "ok" | "err"; text: string }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === "ok"
          ? "border-emerald-400 bg-emerald-100 text-emerald-900"
          : "border-red-400 bg-red-100 text-red-900"
      }`}
    >
      {text}
    </div>
  );
}

function VerificationCard({
  label,
  verified,
  hint,
}: {
  label: string;
  verified: boolean;
  hint: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        verified
          ? "border-emerald-400 bg-emerald-50"
          : "border-ink-700 bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
            verified
              ? "bg-emerald-100 text-emerald-900"
              : "bg-ink-900 text-ink-300"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-base font-bold">{label}</p>
          <p className="text-xs text-ink-300">
            {verified ? "Verified" : "Not yet verified"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-300">{hint}</p>
    </div>
  );
}
