"use client"

import { useState, useRef } from "react"
import { useStorage } from "@/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Button } from "@/components/ui/button"
import { ImageIcon, Loader2, X, UploadCloud } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  pathPrefix?: string;
}

export function ImageUploader({ value, onChange, pathPrefix = "uploads" }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storage = useStorage()
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." })
      return
    }

    setIsUploading(true)
    try {
      const filename = `${pathPrefix}/${Date.now()}-${file.name}`
      const storageRef = ref(storage, filename)
      
      const snapshot = await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(snapshot.ref)
      
      onChange(downloadUrl)
      toast({ title: "Image Uploaded" })
    } catch (error) {
      console.error("Upload failed", error)
      toast({ variant: "destructive", title: "Upload Failed", description: "Failed to upload the image." })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full">
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      
      {value ? (
        <div className="relative group w-full h-48 rounded-xl overflow-hidden border border-border bg-muted/30">
          <Image 
            src={value} 
            alt="Uploaded Preview" 
            fill
            className="object-cover transition-opacity group-hover:opacity-60"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/20 backdrop-blur-sm gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
              Change
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => onChange("")}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`w-full h-48 border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-primary">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm font-bold">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <UploadCloud className="h-6 w-6 text-primary/60" />
              </div>
              <p className="text-sm font-bold text-foreground">Click to upload featured image</p>
              <p className="text-xs mt-1 font-medium opacity-70">PNG, JPG or WEBP (max. 5MB)</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
