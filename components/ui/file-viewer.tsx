"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { FileIcon, Eye, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileViewerProps {
  url: string;
  alt?: string;
  thumbnailSize?: "sm" | "md" | "lg";
}

export function FileViewer({ url, alt = "File", thumbnailSize = "sm" }: FileViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!url || url === "-") return <span className="text-gray-400">-</span>;

  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|svg|avif)(\?.*)?$/i);
  const isPdf = url.match(/\.pdf(\?.*)?$/i);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, "_blank");
  };

  const Thumbnail = () => (
    <div className={`${sizeClasses[thumbnailSize]} relative rounded border bg-muted flex items-center justify-center overflow-hidden cursor-pointer group`}>
      {isImage ? (
        <img
          src={url}
          alt={alt}
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
        />
      ) : isPdf ? (
        <FileIcon className="w-1/2 h-1/2 text-red-500" />
      ) : (
        <FileIcon className="w-1/2 h-1/2 text-muted-foreground" />
      )}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Eye className="w-4 h-4 text-white" />
      </div>
    </div>
  );

  return (
    <div className="flex items-center">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <DialogTrigger asChild>
              <div>
                <Thumbnail />
              </div>
            </DialogTrigger>
          </HoverCardTrigger>
          
          <HoverCardContent side="right" className="w-64 p-0 overflow-hidden border-none shadow-2xl">
            {isImage ? (
              <div className="relative aspect-square">
                <img src={url} alt={alt} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[10px] text-white truncate">{url.split('/').pop()?.split('?')[0]}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 flex flex-col items-center gap-2 bg-muted/30">
                <FileIcon className={`w-12 h-12 ${isPdf ? "text-red-500" : "text-muted-foreground"}`} />
                <p className="text-xs font-medium truncate w-full text-center">
                   {isPdf ? "PDF Document" : "File Attachment"}
                </p>
              </div>
            )}
          </HoverCardContent>
        </HoverCard>

        <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-sm font-medium truncate pr-8">
              {url.split('/').pop()?.split('?')[0]}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 gap-2">
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
              <Button variant="outline" size="sm" asChild className="h-8 gap-2">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Original
                </a>
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 bg-muted/20 flex items-center justify-center p-4 overflow-auto">
            {isImage ? (
              <img
                src={url}
                alt={alt}
                className="max-w-full max-h-full object-contain shadow-lg"
              />
            ) : isPdf ? (
              <iframe
                src={`${url}#toolbar=0`}
                className="w-full h-full border-none rounded shadow-lg"
                title="PDF Preview"
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <FileIcon className="w-20 h-20 text-muted-foreground" />
                <p className="text-muted-foreground">Preview not available for this file type</p>
                <Button asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">Download File</a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
