"use client";

import { useState } from "react";
import { Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { UploadProgress } from "@/components/upload/upload-progress";
import {
  getSignedUploadUrl,
  createVideoFromUpload,
  createVideoFromUrl,
} from "@/lib/actions/videos";
import { isValidVideoUrl } from "@/lib/utils/video-utils";

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onVideoCreated?: () => void;
}

export function VideoUploadDialog({
  open,
  onOpenChange,
  projectId,
  onVideoCreated,
}: VideoUploadDialogProps) {
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");

  // URL state
  const [videoUrl, setVideoUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlDescription, setUrlDescription] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadTitle("");
    setUploadDescription("");
    setVideoUrl("");
    setUrlTitle("");
    setUrlDescription("");
    setIsAddingUrl(false);
    setError(null);
  };

  const handleClose = () => {
    if (!isUploading) {
      resetState();
      onOpenChange(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Pre-fill title with filename (without extension)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setUploadTitle(nameWithoutExt);
    setError(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // 1. Get signed upload URL
      const { data: uploadData, error: urlError } = await getSignedUploadUrl(
        projectId,
        selectedFile.name,
        selectedFile.type
      );

      if (urlError || !uploadData) {
        throw new Error(urlError || "Failed to get upload URL");
      }

      // 2. Upload to Supabase Storage using XHR for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("PUT", uploadData.signedUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        xhr.send(selectedFile);
      });

      // 3. Create video record in database
      const { error: createError } = await createVideoFromUpload(
        projectId,
        uploadTitle || selectedFile.name,
        uploadData.path,
        {
          description: uploadDescription || undefined,
          file_size_bytes: selectedFile.size,
          mime_type: selectedFile.type,
        }
      );

      if (createError) {
        throw new Error(createError);
      }

      // Success
      onVideoCreated?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  };

  const handleAddUrl = async () => {
    if (!videoUrl || !isValidVideoUrl(videoUrl)) {
      setError("Please enter a valid video URL");
      return;
    }

    setIsAddingUrl(true);
    setError(null);

    const { error: createError } = await createVideoFromUrl(
      projectId,
      urlTitle || "Untitled Video",
      videoUrl,
      urlDescription || undefined
    );

    setIsAddingUrl(false);

    if (createError) {
      setError(createError);
      return;
    }

    onVideoCreated?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Video</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" disabled={isUploading}>
              Upload File
            </TabsTrigger>
            <TabsTrigger value="link" disabled={isUploading}>
              Add Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {isUploading ? (
              <UploadProgress
                progress={uploadProgress}
                fileName={selectedFile?.name || ""}
                fileSize={selectedFile?.size}
              />
            ) : (
              <>
                <FileDropzone onFileSelect={handleFileSelect} />

                {selectedFile && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="upload-title">Title</Label>
                      <Input
                        id="upload-title"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Video title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="upload-description">Description (optional)</Label>
                      <Input
                        id="upload-description"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Add a description"
                      />
                    </div>

                    <Button
                      onClick={handleFileUpload}
                      className="w-full"
                      disabled={!selectedFile}
                    >
                      Upload Video
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supports YouTube and direct video URLs
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url-title">Title</Label>
              <Input
                id="url-title"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                placeholder="Video title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url-description">Description (optional)</Label>
              <Input
                id="url-description"
                value={urlDescription}
                onChange={(e) => setUrlDescription(e.target.value)}
                placeholder="Add a description"
              />
            </div>

            <Button
              onClick={handleAddUrl}
              className="w-full"
              disabled={!videoUrl || isAddingUrl}
            >
              {isAddingUrl ? "Adding..." : "Add Video"}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
