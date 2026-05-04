"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, FileIcon, UploadCloud } from "lucide-react";
import { useMutationApi } from "@/hooks/api/useMutationApi";
import { API } from "@/lib/api/api-endpoints";

interface FileUploadProps {
  label?: string;
  onUploadSuccess: (url: string, fileName: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
  accept?: string;
  defaultUrl?: string;
}

export function FileUpload({
  label = "Upload File",
  onUploadSuccess,
  onRemove,
  maxSizeMB = 1,
  accept = "image/*,application/pdf",
  defaultUrl = "",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultUrl || null);
  const [error, setError] = useState<string | null>(null);

  const getPresignedUrlMutation = useMutationApi<{ presignedUrl: string; publicUrl: string; fileName: string }, { fileName: string; fileType: string }>(
    API.UPLOAD,
    { method: "POST" }
  );

  React.useEffect(() => {
    setPreviewUrl(defaultUrl || null);
  }, [defaultUrl]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (onRemove) {
      onRemove();
    }
  };

  const uploadToS3 = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      // 1. Get presigned URL
      const response = await getPresignedUrlMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type,
      });
      
      const { presignedUrl, publicUrl, fileName } = response.data;

      // 2. Upload file directly to S3
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("S3 Upload Error Response:", errorText);
        throw new Error(`Failed to upload file to S3: ${uploadRes.status} ${uploadRes.statusText}`);
      }

      setPreviewUrl(publicUrl);
      onUploadSuccess(publicUrl, fileName);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File exceeds ${maxSizeMB}MB.`);
      e.target.value = "";
      return;
    }

    await uploadToS3(file);
  };

  const isImage = previewUrl?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || (!previewUrl?.endsWith('.pdf') && previewUrl !== null);

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      
      {!previewUrl && !isUploading && (
        <div 
          onClick={handleClick}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Max size: {maxSizeMB}MB
          </p>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>
      )}

      {isUploading && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm font-medium">Uploading...</p>
        </div>
      )}

      {previewUrl && !isUploading && (
        <div className="relative border rounded-lg p-2 flex items-center gap-3">
          <div className="w-12 h-12 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center relative">
            {isImage ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <FileIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {previewUrl.split('/').pop()}
            </p>
            <p className="text-xs text-muted-foreground">Uploaded successfully</p>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
