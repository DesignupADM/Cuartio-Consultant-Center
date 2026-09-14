"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  Sparkles,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { createOpportunity } from "@/firebase/firestore/opportunities"
import { generateOpportunity } from "@/ai/flows/generate-opportunity-flow"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { OpportunityEditor } from "@/components/editor/OpportunityEditor"
import { FormBuilder } from "@/components/editor/FormBuilder"
import { FormField } from "@/firebase/firestore/opportunities"
import { ImageUploader } from "@/components/ui/image-uploader"
import Link from "next/link"

export default function NewOpportunityPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()

  const [publishedOppLink, setPublishedOppLink] = useState("")
  const [isPublishSuccessDialogOpen, setIsPublishSuccessDialogOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    toast({ title: "Link copied to clipboard" })
    setTimeout(() => setIsCopied(false), 2000)
  }

  const [isGenerating, setIsGenerating] = useState(false)
  const [formValues, setFormValues] = useState({
    title: "",
    location: "",
    region: "",
    duration: "",
    deadline: "",
    description: "",
    content: "",
    featuredImage: "",
    tags: "",
    requirements: "",
    formSchema: [] as FormField[]
  })

  const handleAIGenerate = async () => {
    if (!formValues.title) {
      toast({ variant: "destructive", title: "Missing Title", description: "Please enter a project title first." });
      return;
    }
    setIsGenerating(true)
    try {
      const result = await generateOpportunity({ 
        title: formValues.title, 
        context: formValues.description 
      });
      setFormValues(prev => ({
        ...prev,
        content: result.contentHtml,
        tags: result.tags.join(", "),
        duration: result.suggestedDuration,
        region: result.suggestedRegion
      }));
      toast({ title: "AI Generation Complete", description: "Project details have been populated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: e.message });
    } finally {
      setIsGenerating(false)
    }
  }

  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const saveOpportunity = async (status: 'open' | 'draft') => {
    const newOpp = {
      title: formValues.title,
      location: formValues.location,
      region: formValues.region,
      duration: formValues.duration,
      deadline: formValues.deadline,
      description: formValues.description,
      content: formValues.content,
      featuredImage: formValues.featuredImage,
      tags: formValues.tags.split(",").map(t => t.trim()).filter(Boolean),
      requirements: formValues.requirements.split("\n").map(r => r.trim()).filter(Boolean),
      formSchema: formValues.formSchema,
      status
    }

    try {
      const oppId = await createOpportunity(db, newOpp);

      if (status === 'draft') {
        toast({ title: "Draft Saved", description: "Your project is saved as a draft and is not publicly visible." })
        router.push("/dashboard/opportunities")
        return
      }

      setFormValues({ title: "", location: "", region: "", duration: "", deadline: "", description: "", content: "", featuredImage: "", tags: "", requirements: "", formSchema: [] });
      
      const publicLink = `${window.location.origin}/public/opportunities/${oppId}`;
      setPublishedOppLink(publicLink);
      setIsPublishSuccessDialogOpen(true);
      
      toast({ title: "Opportunity Created" })
    } catch (err: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'opportunities',
        operation: 'create',
        requestResourceData: newOpp
      }))
    }
  }

  const handleCreateOpportunity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await saveOpportunity('open')
  }

  const handleSaveDraft = async () => {
    if (!formValues.title.trim()) {
      toast({
        variant: "destructive",
        title: "Title Required",
        description: "Add a project title before saving a draft."
      })
      return
    }
    setIsSavingDraft(true)
    try {
      await saveOpportunity('draft')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleCloseSuccess = () => {
    setIsPublishSuccessDialogOpen(false)
    router.push("/dashboard/opportunities")
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 h-10 w-10">
            <Link href="/dashboard/opportunities">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Post New Opportunity</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Create a comprehensive project brief for the network.</p>
          </div>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-white transition-all font-black text-[10px] uppercase tracking-widest self-start md:self-auto h-9"
          onClick={handleAIGenerate}
          disabled={isGenerating || !formValues.title}
        >
          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
          AI Auto-Fill
        </Button>
      </div>

      <div className="bg-card border border-border shadow-xs rounded-xl overflow-hidden">
        <form onSubmit={handleCreateOpportunity} className="flex flex-col">

          <div className="p-8 space-y-12">
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <div className="h-1 w-4 bg-primary rounded-full" /> Featured Image
              </h3>
              <ImageUploader 
                value={formValues.featuredImage}
                onChange={url => setFormValues({...formValues, featuredImage: url})}
                pathPrefix="opportunities/featured"
              />
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <div className="h-1 w-4 bg-primary rounded-full" /> Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Project Title</Label>
                  <Input 
                    placeholder="e.g. Senior Legal Advisor"
                    className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                    value={formValues.title} 
                    onChange={e => setFormValues({...formValues, title: e.target.value})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Location</Label>
                  <Input 
                    placeholder="e.g. Geneva, Switzerland"
                    className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                    value={formValues.location}
                    onChange={e => setFormValues({...formValues, location: e.target.value})}
                    required 
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <div className="h-1 w-4 bg-primary rounded-full" /> Logistics & Scope
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Region</Label>
                  <Input 
                    placeholder="Global"
                    className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                    value={formValues.region}
                    onChange={e => setFormValues({...formValues, region: e.target.value})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Duration</Label>
                  <Input 
                    placeholder="6 Months"
                    className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                    value={formValues.duration}
                    onChange={e => setFormValues({...formValues, duration: e.target.value})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Deadline</Label>
                  <Input 
                    type="date"
                    className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11"
                    value={formValues.deadline}
                    onChange={e => setFormValues({...formValues, deadline: e.target.value})}
                    required 
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <div className="h-1 w-4 bg-primary rounded-full" /> Project Narrative
              </h3>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Internal Notes / AI Context</Label>
                <Textarea 
                  rows={3} 
                  placeholder="Brief notes to feed the AI generator..."
                  className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none p-4"
                  value={formValues.description}
                  onChange={e => setFormValues({...formValues, description: e.target.value})}
                />
              </div>
              <div className="space-y-2 pt-4">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Project Landing Page Content</Label>
                <OpportunityEditor 
                  value={formValues.content}
                  onChange={content => setFormValues({...formValues, content})}
                />
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <div className="h-1 w-4 bg-primary rounded-full" /> Requirements & Metadata
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Key Requirements (one per line)</Label>
                  <Textarea 
                    placeholder="e.g. 10+ years experience in maritime law"
                    className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-24"
                    value={formValues.requirements}
                    onChange={e => setFormValues({...formValues, requirements: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Tags (comma separated)</Label>
                  <Input 
                    placeholder="Legal, Maritime, NGO"
                    className="bg-muted/50 border-border focus:ring-2 focus:ring-primary/20 transition-all font-medium h-11 capitalize"
                    value={formValues.tags}
                    onChange={e => setFormValues({...formValues, tags: e.target.value})}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <div className="h-1 w-4 bg-primary rounded-full" /> Application Form
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">Define the questions applicants must answer. System fields (Name, Email, CV) are always included.</p>
                <FormBuilder 
                  fields={formValues.formSchema}
                  onChange={(fields) => setFormValues({...formValues, formSchema: fields})}
                />
              </div>
            </section>
          </div>

          <div className="p-8 bg-muted/30 border-t border-border/50 flex justify-end gap-3">
            <Button 
              variant="ghost" 
              type="button" 
              asChild
              className="font-bold text-muted-foreground hover:text-foreground"
            >
              <Link href="/dashboard/opportunities">Discard</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-primary/30 text-primary font-black uppercase tracking-widest text-[11px] h-11"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isGenerating}
            >
              {isSavingDraft && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save as Draft
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 px-12 font-black uppercase tracking-widest text-[11px] h-11"
              disabled={isGenerating}
            >
              Publish Project
            </Button>
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      <Dialog open={isPublishSuccessDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseSuccess();
      }}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border ring-1 ring-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-headline flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              Project Published
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium pt-2">
              Your project is now live and can be shared with consultants via the public URL.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 pt-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Link
              </Label>
              <Input
                id="link"
                value={publishedOppLink}
                readOnly
                className="bg-muted/50 border-border focus:ring-primary/20 h-11"
              />
            </div>
            <Button size="icon" onClick={() => copyToClipboard(publishedOppLink)} className="h-11 w-11 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border-none">
              <span className="sr-only">Copy</span>
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={handleCloseSuccess} className="font-bold">
              Close
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 font-bold" 
              onClick={() => {
                copyToClipboard(publishedOppLink)
                handleCloseSuccess()
              }}
            >
              Copy & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
