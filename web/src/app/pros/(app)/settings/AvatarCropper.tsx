"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, Upload, X } from "lucide-react";
import { uploadAvatarAction } from "./actions";

const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB before crop
const OUTPUT_DIMENSION = 512; // crop output is 512×512 png

export function AvatarCropper() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [origName, setOrigName] = useState<string>("avatar.png");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCropComplete = useCallback(
    (_area: Area, areaPixels: Area) => setCroppedArea(areaPixels),
    []
  );

  function pickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      setError("Image too large. Max 10 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file (JPG / PNG / WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setOrigName(file.name);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setSrc(null);
    setError(null);
    setCroppedArea(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function buildBlob(): Promise<Blob | null> {
    if (!src || !croppedArea) return null;
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_DIMENSION;
    canvas.height = OUTPUT_DIMENSION;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(
      img,
      croppedArea.x,
      croppedArea.y,
      croppedArea.width,
      croppedArea.height,
      0,
      0,
      OUTPUT_DIMENSION,
      OUTPUT_DIMENSION
    );
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 0.92)
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const blob = await buildBlob();
      if (!blob) {
        setError("Could not crop the image. Try a different file.");
        return;
      }
      const fd = new FormData();
      const baseName = origName.replace(/\.[^.]+$/, "") || "avatar";
      const cropped = new File([blob], `${baseName}-cropped.png`, {
        type: "image/png",
      });
      fd.append("file", cropped);
      // The server action handles redirect (success → ?avatar_msg=uploaded).
      await uploadAvatarAction(fd);
    });
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {!src && (
        <button
          type="button"
          onClick={pickFile}
          className="btn-primary"
        >
          <Upload className="h-4 w-4" />
          Choose &amp; crop photo
        </button>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-900">{error}</p>
      )}

      {src && (
        <div className="mt-4 grid gap-3">
          <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          </div>

          <div className="grid gap-2">
            <label className="flex items-center gap-3 text-xs text-ink-300">
              <span className="w-12 uppercase tracking-[0.18em] text-ink-400">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-amber-accent"
              />
              <span className="w-10 text-right font-mono">{zoom.toFixed(2)}×</span>
            </label>
            <p className="text-xs text-ink-400">
              Drag to pan · pinch / wheel / slider to zoom · output is a 512×512
              circle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !croppedArea}
              className="btn-primary disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Save photo
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="btn-ghost text-sm text-ink-300"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={pickFile}
              disabled={pending}
              className="btn-ghost text-sm text-ink-300"
            >
              Pick a different image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
