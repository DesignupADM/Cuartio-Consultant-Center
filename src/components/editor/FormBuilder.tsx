"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/firebase/firestore/opportunities";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
  // If no fields are provided, initialize with default system fields
  if (!fields || fields.length === 0) {
    onChange(DEFAULT_SYSTEM_FIELDS);
    return null;
  }

  const addField = () => {
    const newField: FormField = {
      id: `custom_${Date.now()}`,
      label: "New Question",
      type: "text",
      required: false,
    };
    onChange([...fields, newField]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id || f.isSystem));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(f => (f.id === id ? { ...f, ...updates } : f)));
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
        onClick={addField}
        className="w-full border-dashed border-2 bg-transparent hover:bg-accent/5 h-12 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Custom Question
      </Button>
    </div>
  );
}
