"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@clerk/nextjs";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { uploadDocument } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  onUploadSuccess: () => void;
}

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const { getToken } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const processUpload = async (file: File) => {
    setSelectedFile(file);
    setUploadState("uploading");
    setProgress(10);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      setProgress(30);
      setUploadState("processing");

      await uploadDocument(file, token);

      setProgress(100);
      setUploadState("success");
      toast({ title: "Document uploaded!", description: `${file.name} is ready to chat.` });
      setTimeout(() => {
        setUploadState("idle");
        setSelectedFile(null);
        setProgress(0);
        onUploadSuccess();
      }, 1500);
    } catch (err: unknown) {
      setUploadState("error");
      toast({
        title: "Upload failed",
        description: (err as Error).message,
        variant: "destructive",
      });
      setTimeout(() => {
        setUploadState("idle");
        setSelectedFile(null);
        setProgress(0);
      }, 2000);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) processUpload(acceptedFiles[0]);
    },
    [getToken]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: uploadState !== "idle",
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-secondary/30",
        uploadState !== "idle" && "pointer-events-none"
      )}
    >
      <input {...getInputProps()} />

      {uploadState === "idle" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">
              {isDragActive ? "Drop your PDF here" : "Upload a PDF document"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Drag & drop or click to browse · Max 50MB
            </p>
          </div>
        </div>
      )}

      {(uploadState === "uploading" || uploadState === "processing") && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div>
            <p className="font-medium">
              {uploadState === "uploading" ? "Uploading..." : "Processing & embedding..."}
            </p>
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFile.name} ({formatBytes(selectedFile.size)})
              </p>
            )}
          </div>
          <div className="w-full max-w-xs bg-secondary rounded-full h-1.5 mt-2">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadState === "success" && (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
          <p className="font-medium text-green-500">Upload complete!</p>
        </div>
      )}

      {uploadState === "error" && (
        <div className="flex flex-col items-center gap-3">
          <FileText className="w-10 h-10 text-destructive" />
          <p className="font-medium text-destructive">Upload failed</p>
        </div>
      )}
    </div>
  );
}
