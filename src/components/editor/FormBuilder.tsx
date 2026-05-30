"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/firebase/firestore/opportunities";
import { Plus, Trash2, GripVertical, Database, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, addDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const DEFAULT_SYSTEM_FIELDS: FormField[] = [
  { id: "first_name", label: "First Name", type: "text", required: true, isSystem: true },
  { id: "last_name", label: "Last Name", type: "text", required: true, isSystem: true },
  { id: "email", label: "Email Address", type: "text", required: true, isSystem: true },
  { id: "cv", label: "CV / Resume", type: "file", required: true, isSystem: true },
];

export function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const db = useFirestore();
  const oppFieldsQuery = useMemo(() => query(collection(db, "opportunityFields")), [db]);
  const { data: globalFields, loading: globalFieldsLoading } = useCollection(oppFieldsQuery as any);

  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"text" | "textarea" | "select">("text");
  const [newOptions, setNewOptions] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!fields || fields.length === 0) {
      onChange(DEFAULT_SYSTEM_FIELDS);
    }
  }, [fields, onChange]);

  if (!fields || fields.length === 0) {
    return null;
  }

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id || f.isSystem));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handlePick = (globalField: any) => {
    if (fields.some(f => f.id === globalField.id)) {
      return; // Already added
    }
    const newField: FormField = {
      id: globalField.id,
      label: globalField.label,
      type: globalField.type,
      required: globalField.required || false,
      options: globalField.options || [],
    };
    onChange([...fields, newField]);
    setIsAddOpen(false);
  };

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setIsCreating(true);
    try {
      const existing = (globalFields || []).find((f: any) => f.label.toLowerCase() === newLabel.trim().toLowerCase());
      let newFieldData: FormField;

      if (existing) {
        newFieldData = {
          id: existing.id,
          label: existing.label,
          type: existing.type,
          required: existing.required || false,
          options: existing.options || [],
        };
      } else {
        const docRef = await addDoc(collection(db, "opportunityFields"), {
          label: newLabel.trim(),
          type: newType,
          required: newRequired,
          options: newType === "select" ? newOptions.split(",").map(o => o.trim()).filter(o => !!o) : [],
          createdAt: new Date().toISOString()
        });
        newFieldData = {
          id: docRef.id,
          label: newLabel.trim(),
          type: newType,
          required: newRequired,
          options: newType === "select" ? newOptions.split(",").map(o => o.trim()).filter(o => !!o) : [],
        };
      }

      if (!fields.some(f => f.id === newFieldData.id)) {
        onChange([...fields, newFieldData]);
      }
      setIsAddOpen(false);
      setNewLabel("");
      setNewType("text");
      setNewOptions("");
      setNewRequired(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className={`p-4 border rounded-md flex gap-4 items-start ${field.isSystem ? 'bg-muted/50 border-border/50' : 'bg-card border-border'}`}>
          <div className="pt-2 text-muted-foreground/50">
            <GripVertical className="h-5 w-5" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Field Label</Label>
                <Input 
                  value={field.label} 
                  onChange={e => updateField(field.id, { label: e.target.value })}
                  disabled={field.isSystem}
                  className="bg-background"
                />
              </div>
              
              <div className="w-48 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Field Type</Label>
                <Select 
                  value={field.type} 
                  onValueChange={(value: any) => updateField(field.id, { type: value })}
                  disabled={field.isSystem}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Short Text</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                    <SelectItem value="select">Dropdown Select</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {field.type === "select" && !field.isSystem && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Options (Comma separated)</Label>
                <Input 
                  value={field.options?.join(", ") || ""} 
                  onChange={e => updateField(field.id, { options: e.target.value.split(",").map(o => o.trim()) })}
                  placeholder="Option 1, Option 2, Option 3"
                  className="bg-background"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id={`required-${field.id}`}
                  checked={field.required}
                  onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                  disabled={field.isSystem}
                />
                <Label htmlFor={`required-${field.id}`} className="text-sm font-medium">Required Field</Label>
              </div>
              
              {field.isSystem ? (
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">System Field</span>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeField(field.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => setIsAddOpen(true)}
        className="w-full border-dashed border-2 bg-transparent hover:bg-accent/5 h-12 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Custom Question
      </Button>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Form Field</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="existing" className="w-full pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Global Library</TabsTrigger>
              <TabsTrigger value="new">Create New</TabsTrigger>
            </TabsList>
            
            <TabsContent value="existing" className="space-y-4 pt-4">
              <div className="grid gap-2 max-h-64 overflow-y-auto pr-2">
                {globalFieldsLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : !globalFields || globalFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No global fields defined yet.</p>
                ) : (
                  globalFields.map((gf: any) => {
                    const isAdded = fields.some(f => f.id === gf.id);
                    return (
                      <div key={gf.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-semibold text-sm">{gf.label}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest">{gf.type}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isAdded ? "secondary" : "default"}
                          disabled={isAdded}
                          onClick={() => handlePick(gf)}
                        >
                          {isAdded ? "Added" : "Add"}
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="new" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Field Label</Label>
                <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Portfolio URL" />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Short Text</SelectItem>
                    <SelectItem value="textarea">Long Answer</SelectItem>
                    <SelectItem value="select">Dropdown Menu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newType === "select" && (
                <div className="space-y-2">
                  <Label>Options (comma separated)</Label>
                  <Input value={newOptions} onChange={e => setNewOptions(e.target.value)} placeholder="Option 1, Option 2" />
                </div>
              )}
              <div className="flex items-center gap-2 py-2">
                <Switch id="new-req" checked={newRequired} onCheckedChange={setNewRequired} />
                <Label htmlFor="new-req">Required</Label>
              </div>
              <Button onClick={handleCreate} disabled={!newLabel.trim() || isCreating} className="w-full">
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                Create & Add to Form
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
