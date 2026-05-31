"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@tinymce/tinymce-react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-muted/10 animate-pulse text-muted-foreground text-sm font-medium">
      Loading rich text editor...
    </div>
  ),
});
import { useStorage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRef } from "react";

interface OpportunityEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function OpportunityEditor({ value, onChange }: OpportunityEditorProps) {
  const storage = useStorage();
  const editorRef = useRef<any>(null);

  const handleImageUpload = async (blobInfo: any, progress: (p: number) => void): Promise<string> => {
    try {
      const file = blobInfo.blob();
      const filename = `opportunities/images/${Date.now()}-${blobInfo.filename()}`;
      const storageRef = ref(storage, filename);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (error) {
      console.error("Image upload failed:", error);
      throw new Error("Image upload failed");
    }
  };

  return (
    <div className="border border-border rounded-md overflow-hidden shadow-xs">
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        onInit={(evt, editor) => editorRef.current = editor}
        value={value}
        onEditorChange={(content) => onChange(content)}
        init={{
          height: 600,
          menubar: true,
          plugins: [
            "lists",
            "link",
            "image",
            "table",
            "code",
            "preview",
            "fullscreen",
            "wordcount",
          ],
          toolbar:
            "undo redo | styles | bold italic underline | alignleft aligncenter alignright | bullist numlist | table image link | fullscreen preview",
          images_upload_handler: handleImageUpload,
          content_style: "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; }",
        }}
      />
    </div>
  );
}
