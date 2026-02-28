"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Upload, CheckCircle, AlertCircle, Loader2, FileUp } from "lucide-react";

interface LinkInfo {
  label: string;
  allowedTypes: string;
  maxFileSize: number;
  businessName: string | null;
  businessLogo: string | null;
}

export default function PublicUploadPage() {
  const { token } = useParams<{ token: string }>();
  const inputRef = useRef<HTMLInputElement>(null);

  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Validate the upload link
  useEffect(() => {
    async function validateLink() {
      try {
        const res = await fetch(`/api/upload/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "This upload link is not valid.");
        }
        const data = await res.json();
        setLinkInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid link");
      } finally {
        setLoading(false);
      }
    }
    if (token) validateLink();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !clientName.trim() || !clientEmail.trim()) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientName", clientName.trim());
      formData.append("clientEmail", clientEmail.trim());
      if (description.trim()) formData.append("description", description.trim());

      const res = await fetch(`/api/upload/${token}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Upload failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Invalid/expired link
  if (!linkInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Link Not Available</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">File Uploaded</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Your file has been submitted for quoting. {linkInfo.businessName ? `${linkInfo.businessName} will` : "They'll"} be in touch soon.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setFile(null);
              setClientName("");
              setClientEmail("");
              setDescription("");
            }}
            className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Upload another file
          </button>
        </div>
      </div>
    );
  }

  const maxMB = Math.round(linkInfo.maxFileSize / 1024 / 1024);
  const allowedTypes = linkInfo.allowedTypes.split(",").map((t) => t.trim());
  const allowedExtsDisplay = allowedTypes.map((t) => `.${t}`).join(", ");

  // Build accept string with both extensions and MIME types so mobile file pickers work.
  // Mobile browsers (iOS especially) hide files with unknown extensions like .stl.
  const MIME_MAP: Record<string, string[]> = {
    stl: [".stl", "model/stl", "application/vnd.ms-pki.stl", "application/sla"],
    "3mf": [".3mf", "application/vnd.ms-package.3dmanufacturing-3dmodel+xml", "model/3mf"],
    step: [".step", ".stp", "application/step", "model/step"],
    stp: [".stp", ".step"],
    obj: [".obj", "model/obj"],
    gcode: [".gcode", ".gco", ".g", "text/x-gcode"],
    gco: [".gco"],
    g: [".g"],
    pdf: [".pdf", "application/pdf"],
  };
  const acceptParts = new Set<string>();
  for (const t of allowedTypes) {
    const mimes = MIME_MAP[t];
    if (mimes) mimes.forEach((m) => acceptParts.add(m));
    else acceptParts.add(`.${t}`);
  }
  // Always include octet-stream so mobile "Browse" shows unrecognised binary files
  acceptParts.add("application/octet-stream");
  const acceptAttr = Array.from(acceptParts).join(",");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="border-b border-neutral-200 p-6 text-center dark:border-neutral-800">
          {linkInfo.businessLogo ? (
            <img
              src={linkInfo.businessLogo}
              alt=""
              className="mx-auto mb-3 h-12 w-12 rounded-lg object-contain"
            />
          ) : (
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {linkInfo.businessName ? `Upload to ${linkInfo.businessName}` : "Upload File for Quote"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Upload your 3D model and we&apos;ll prepare a quote for you.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* File drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                : file
                  ? "border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
                  : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={acceptAttr}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
                e.target.value = "";
              }}
            />
            {file ? (
              <div>
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{file.name}</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {(file.size / 1024 / 1024).toFixed(1)} MB — click to change
                </p>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Drop your file here or click to browse
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {allowedExtsDisplay} — max {maxMB}MB
                </p>
              </div>
            )}
          </div>

          {/* Name (required) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Your Name *
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
          </div>

          {/* Email (required) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Email *
            </label>
            <input
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Description <span className="text-neutral-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Material preferences, quantity, deadline, or any other details..."
              rows={3}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={uploading || !file || !clientName.trim() || !clientEmail.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              "Submit for Quote"
            )}
          </button>

          <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
            Your file will be securely uploaded and reviewed for quoting. You&apos;ll receive a confirmation email.
          </p>
        </form>
      </div>
    </div>
  );
}
