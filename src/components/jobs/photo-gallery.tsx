"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, X, Loader2, Camera } from "lucide-react";

interface JobPhoto {
  id: string;
  jobId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export function PhotoGallery({ jobId }: { jobId: string }) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<JobPhoto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Close lightbox on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxPhoto(null);
    }
    if (lightboxPhoto) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [lightboxPhoto]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to upload photo");
        return;
      }

      await fetchPhotos();
    } catch {
      alert("Failed to upload photo");
    } finally {
      setUploading(false);
      // Reset input so the same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(photo: JobPhoto) {
    if (!confirm(`Delete "${photo.originalName}"?`)) return;

    setDeletingId(photo.id);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos/${photo.id}`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 204) {
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        if (lightboxPhoto?.id === photo.id) setLightboxPhoto(null);
      }
    } catch {
      // Non-critical
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* Upload button + hidden input */}
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-3.5 w-3.5" />
              Upload Photo
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Photo grid or empty state */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Camera className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-xs text-muted-foreground">
            No photos yet. Upload photos to document this job.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Responsive grid: 3 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted cursor-pointer"
                onClick={() => setLightboxPhoto(photo)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${photo.filename}`}
                  alt={photo.originalName}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {/* Delete button overlay */}
                <button
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo);
                  }}
                  disabled={deletingId === photo.id}
                >
                  {deletingId === photo.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightboxPhoto(null)}
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/uploads/${lightboxPhoto.filename}`}
            alt={lightboxPhoto.originalName}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white">
            {lightboxPhoto.originalName}
          </div>
        </div>
      )}
    </div>
  );
}
