"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useFirestore } from "@/firebase"
import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch, 
  query, 
  orderBy, 
  serverTimestamp,
  Firestore
} from "firebase/firestore"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { COUNTRY_CODE_MAP } from "@/lib/countries"
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  Sparkles, 
  Plus, 
  FileText,
  HelpCircle,
  Loader2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// --- Custom CSV Parser ---
function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"'
          i++ // Skip next quote
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ",") {
        row.push(cell.trim())
        cell = ""
      } else if (char === "\r" || char === "\n") {
        row.push(cell.trim())
        cell = ""
        if (row.some(val => val !== "")) {
          lines.push(row)
        }
        row = []
        if (char === "\r" && nextChar === "\n") {
          i++ // Skip LF in CRLF
        }
      } else {
        cell += char
      }
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell.trim())
    if (row.some(val => val !== "")) {
      lines.push(row)
    }
  }

  return lines
}

// --- Target Database Fields Mapping ---
interface TargetField {
  id: string
  label: string
  required: boolean
  isCore: boolean
  isNumber?: boolean
  isCustom?: boolean
  type?: "question" | "oppField"
}

const CORE_FIELDS: TargetField[] = [
  { id: "firstName", label: "First Name", required: true, isCore: true },
  { id: "lastName", label: "Last Name", required: true, isCore: true },
  { id: "email", label: "Email Address", required: true, isCore: true },
  { id: "phone", label: "Phone Number", required: false, isCore: true },
  { id: "country", label: "Country", required: false, isCore: true },
  { id: "years", label: "Years Experience", required: false, isCore: true, isNumber: true },
  { id: "profession", label: "Profession", required: false, isCore: true },
  { id: "sector", label: "Sector / Area", required: false, isCore: true },
  { id: "language", label: "Primary Language", required: false, isCore: true },
  { id: "bio", label: "Professional Bio", required: false, isCore: true },
  { id: "status", label: "Status (verified/pending/rejected)", required: false, isCore: true }
]

interface ColumnMapping {
  csvHeader: string
  targetFieldId: string // Core ID, Custom ID, "skip", "create_question", "create_opp_field"
  newFieldLabel: string
  newFieldType: "text" | "textarea" | "select"
  newFieldOptions: string
  newFieldRequired: boolean
  previewValues: string[]
}

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

export function CsvImportDialog({ open, onOpenChange, onImportComplete }: CsvImportDialogProps) {
  const db = useFirestore()
  const { toast } = useToast()
  
  // Dialog steps: 'upload', 'mapping', 'preview', 'importing', 'complete'
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload')
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  
  // Database fields
  const [dbQuestions, setDbQuestions] = useState<any[]>([])
  const [dbOppFields, setDbOppFields] = useState<any[]>([])
  const [loadingDbFields, setLoadingDbFields] = useState(false)
  
  // Mapping state
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  
  // Import Progress
  const [progress, setProgress] = useState(0)
  const [importSummary, setImportSummary] = useState({
    totalRows: 0,
    imported: 0,
    skipped: 0,
    createdQuestions: 0,
    createdOppFields: 0,
    errors: [] as string[]
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  // Combined List of DB Fields
  const allDbFields = useMemo(() => {
    const customFields: TargetField[] = [
      ...dbQuestions.map(q => ({
        id: q.id,
        label: `${q.label} (Reg. Question)`,
        required: q.required || false,
        isCore: false,
        isCustom: true,
        type: "question" as const
      })),
      ...dbOppFields.map(f => ({
        id: f.id,
        label: `${f.label} (Project Field)`,
        required: f.required || false,
        isCore: false,
        isCustom: true,
        type: "oppField" as const
      }))
    ]
    return [...CORE_FIELDS, ...customFields]
  }, [dbQuestions, dbOppFields])

  // Fetch Custom Questions and Fields
  const fetchDbFields = useCallback(async () => {
    setLoadingDbFields(true)
    try {
      const qSnap = await getDocs(query(collection(db, "settings", "registration", "questions"), orderBy("order", "asc")))
      const questionsData = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setDbQuestions(questionsData)

      const fSnap = await getDocs(collection(db, "opportunityFields"))
      const fieldsData = fSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setDbOppFields(fieldsData)
    } catch (err) {
      console.error("Failed to load db custom fields", err)
      toast({
        variant: "destructive",
        title: "Error Loading Fields",
        description: "Failed to fetch database custom fields configuration."
      })
    } finally {
      setLoadingDbFields(false)
    }
  }, [db, toast])

  // Reset states on dialog reopen
  useEffect(() => {
    if (open) {
      setStep('upload')
      setCsvData(null)
      setMappings([])
      setProgress(0)
      setImportSummary({
        totalRows: 0,
        imported: 0,
        skipped: 0,
        createdQuestions: 0,
        createdOppFields: 0,
        errors: []
      })
      fetchDbFields()
    }
  }, [open, fetchDbFields])

  // Handle auto-mapping of headers
  const getAutoMapping = (header: string): string => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "")
    
    // Check custom fields exact match by label
    const customMatch = allDbFields.find(f => 
      f.isCustom && f.label.replace(/\s*\(.*\)$/, "").toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
    )
    if (customMatch) return customMatch.id

    // Check exact core ID match
    const exactCore = CORE_FIELDS.find(f => f.id.toLowerCase() === normalized)
    if (exactCore) return exactCore.id

    // Fuzzy core mapping
    if (["firstname", "first", "givenname", "fname"].includes(normalized)) return "firstName"
    if (["lastname", "last", "surname", "familyname", "lname"].includes(normalized)) return "lastName"
    if (["email", "emailaddress", "mail", "e-mail"].includes(normalized)) return "email"
    if (["phone", "phonenumber", "telephone", "mobile", "cell", "contact"].includes(normalized)) return "phone"
    if (["country", "nation", "location", "residence"].includes(normalized)) return "country"
    if (["years", "experience", "yearsofexperience", "yearsexperience", "yoe"].includes(normalized)) return "years"
    if (["profession", "job", "title", "role", "occupation"].includes(normalized)) return "profession"
    if (["sector", "industry", "field", "area"].includes(normalized)) return "sector"
    if (["language", "languages", "primarylanguage"].includes(normalized)) return "language"
    if (["bio", "biography", "about", "description"].includes(normalized)) return "bio"
    if (["status", "verificationstatus"].includes(normalized)) return "status"

    // Default to unrecognized
    return "create_question"
  }

  // Handle file selection
  const processCSVText = (text: string) => {
    try {
      const parsed = parseCSV(text)
      if (parsed.length < 2) {
        toast({
          variant: "destructive",
          title: "Invalid CSV file",
          description: "Your CSV must contain at least a header row and one row of data."
        })
        return
      }

      const headers = parsed[0]
      const rows = parsed.slice(1)

      setCsvData({ headers, rows })

      // Generate initial mappings
      const initialMappings: ColumnMapping[] = headers.map((header, idx) => {
        const previewValues = rows.slice(0, 3).map(row => row[idx] || "")
        const autoTarget = getAutoMapping(header)
        return {
          csvHeader: header,
          targetFieldId: autoTarget,
          newFieldLabel: header,
          newFieldType: "text",
          newFieldOptions: "",
          newFieldRequired: false,
          previewValues
        }
      })

      setMappings(initialMappings)
      setStep('mapping')
    } catch (err) {
      toast({
        variant: "destructive",
        title: "CSV Parse Failed",
        description: "An error occurred while parsing the CSV. Please check file format."
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      processCSVText(event.target?.result as string)
    }
    reader.readAsText(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type === "text/csv") {
      const reader = new FileReader()
      reader.onload = (event) => {
        processCSVText(event.target?.result as string)
      }
      reader.readAsText(file)
    } else {
      toast({
        variant: "destructive",
        title: "Unsupported file",
        description: "Please drag and drop a valid .csv file."
      })
    }
  }

  const handleMappingChange = (csvHeader: string, targetFieldId: string) => {
    setMappings(prev => prev.map(m => {
      if (m.csvHeader === csvHeader) {
        return { ...m, targetFieldId }
      }
      return m
    }))
  }

  const handleNewFieldConfigChange = (csvHeader: string, key: keyof ColumnMapping, value: any) => {
    setMappings(prev => prev.map(m => {
      if (m.csvHeader === csvHeader) {
        return { ...m, [key]: value }
      }
      return m
    }))
  }

  // Mapped validations: must map required fields (firstName, lastName, email)
  const isMappingValid = useMemo(() => {
    const mappedTargets = mappings.map(m => m.targetFieldId)
    const hasFirstName = mappedTargets.includes("firstName")
    const hasLastName = mappedTargets.includes("lastName")
    const hasEmail = mappedTargets.includes("email")
    
    // Ensure emails are mapped
    return hasFirstName && hasLastName && hasEmail
  }, [mappings])

  const missingRequiredFields = useMemo(() => {
    const mappedTargets = mappings.map(m => m.targetFieldId)
    const missing: string[] = []
    if (!mappedTargets.includes("firstName")) missing.push("First Name")
    if (!mappedTargets.includes("lastName")) missing.push("Last Name")
    if (!mappedTargets.includes("email")) missing.push("Email Address")
    return missing
  }, [mappings])

  // Executes actual imports
  const executeImport = async () => {
    if (!csvData) return
    setStep('importing')
    setProgress(0)

    let createdQuestionsCount = 0
    let createdOppFieldsCount = 0
    const errorsList: string[] = []

    try {
      // 1. Create Dynamic Custom Fields if needed
      const fieldIdMap: Record<string, string> = {} // maps csvHeader -> newly created field docId
      
      const newQuestionsToCreate = mappings.filter(m => m.targetFieldId === "create_question")
      const newOppFieldsToCreate = mappings.filter(m => m.targetFieldId === "create_opp_field")

      // Create Registration Questions
      if (newQuestionsToCreate.length > 0) {
        const registrationSettingsRef = doc(db, "settings", "registration")
        // Get current questions to find next order
        const qSnap = await getDocs(collection(db, "settings", "registration", "questions"))
        let startOrder = qSnap.size

        for (const config of newQuestionsToCreate) {
          const newDocRef = doc(collection(db, "settings", "registration", "questions"))
          const docId = newDocRef.id
          
          await writeBatch(db)
            .set(newDocRef, {
              label: config.newFieldLabel,
              type: config.newFieldType,
              required: config.newFieldRequired,
              order: startOrder++,
              options: config.newFieldType === "select" ? config.newFieldOptions.split(",").map(o => o.trim()).filter(o => !!o) : []
            })
            .commit()
          
          fieldIdMap[config.csvHeader] = docId
          createdQuestionsCount++
        }
      }

      // Create Opportunity Fields
      for (const config of newOppFieldsToCreate) {
        const newDocRef = doc(collection(db, "opportunityFields"))
        const docId = newDocRef.id
        
        await writeBatch(db)
          .set(newDocRef, {
            label: config.newFieldLabel,
            type: config.newFieldType,
            required: config.newFieldRequired,
            options: config.newFieldType === "select" ? config.newFieldOptions.split(",").map(o => o.trim()).filter(o => !!o) : [],
            createdAt: new Date().toISOString()
          })
          .commit()

        fieldIdMap[config.csvHeader] = docId
        createdOppFieldsCount++
      }

      // 2. Import Row Data In Batches (Safely chunk in 150 rows per batch, generating 300 document writes: profile + roles)
      const rows = csvData.rows
      const batchSize = 150
      let totalImported = 0
      let totalSkipped = 0

      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize)
        const batch = writeBatch(db)

        for (const row of chunk) {
          // Extract profile fields based on mappings
          const profile: any = {
            customAnswers: {}
          }

          let emailVal = ""
          let hasCoreInfo = true

          mappings.forEach((mapping, colIdx) => {
            const val = (row[colIdx] || "").trim()
            if (mapping.targetFieldId === "skip") return

            let targetFieldId = mapping.targetFieldId

            // Resolve newly created field IDs
            if (targetFieldId === "create_question" || targetFieldId === "create_opp_field") {
              targetFieldId = fieldIdMap[mapping.csvHeader]
            }

            if (!targetFieldId) return

            const targetDef = allDbFields.find(f => f.id === targetFieldId)
            const isCore = targetDef ? targetDef.isCore : CORE_FIELDS.some(f => f.id === targetFieldId)

            if (isCore) {
              if (targetFieldId === "email") {
                emailVal = val.toLowerCase()
                profile.email = emailVal
              } else if (targetFieldId === "years") {
                profile.years = Number(val) || 0
              } else if (targetFieldId === "country") {
                // Normalize country
                const lowerCountry = val.toLowerCase()
                profile.country = COUNTRY_CODE_MAP[lowerCountry] || val
              } else if (targetFieldId === "status") {
                const normStatus = val.toLowerCase()
                profile.status = ["verified", "pending", "rejected"].includes(normStatus) ? normStatus : "pending"
              } else {
                profile[targetFieldId] = val
              }
            } else {
              // Custom field goes into customAnswers
              profile.customAnswers[targetFieldId] = val
            }
          })

          // Validate email
          if (!emailVal || !emailVal.includes("@")) {
            totalSkipped++
            errorsList.push(`Skipped row: missing or invalid email address.`)
            continue
          }

          // Generate Firestore UIDs
          const newUid = doc(collection(db, "consultantProfiles")).id
          profile.id = newUid
          profile.uid = newUid
          profile.status = profile.status || "pending"
          profile.createdAt = new Date().toISOString()
          profile.lastUpdate = new Date().toISOString()

          const roleDocRef = doc(db, "consultantRoles", newUid)
          const profileDocRef = doc(db, "consultantProfiles", newUid)

          batch.set(roleDocRef, { enabled: true })
          batch.set(profileDocRef, profile)
          totalImported++
        }

        await batch.commit()
        setProgress(Math.round(((i + chunk.length) / rows.length) * 100))
      }

      setImportSummary({
        totalRows: rows.length,
        imported: totalImported,
        skipped: totalSkipped,
        createdQuestions: createdQuestionsCount,
        createdOppFields: createdOppFieldsCount,
        errors: errorsList
      })

      setStep('complete')
      onImportComplete()
    } catch (err: any) {
      console.error("Batch import execution failed", err)
      toast({
        variant: "destructive",
        title: "Import Error",
        description: err.message || "An unexpected error occurred during database migration."
      })
      setStep('mapping')
    }
  }

  // Format dynamic value preview for rendering
  const getMappedPreviewRowVal = (row: string[], mapping: ColumnMapping, colIdx: number) => {
    const val = (row[colIdx] || "").trim()
    if (mapping.targetFieldId === "skip") return <span className="text-muted-foreground italic text-xs">Skipped</span>
    if (mapping.targetFieldId === "years") return <span className="font-mono text-primary">{Number(val) || 0}</span>
    if (mapping.targetFieldId === "country") {
      const norm = COUNTRY_CODE_MAP[val.toLowerCase()] || val
      return <Badge variant="outline" className="font-normal">{norm}</Badge>
    }
    if (mapping.targetFieldId === "status") {
      return <Badge className="text-[10px] uppercase">{val || "pending"}</Badge>
    }
    return <span className="truncate max-w-[120px] block text-xs">{val || "—"}</span>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl h-[85vh] md:h-[80vh] min-h-[600px] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                Import Expert Directory CSV
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Upload and map consultant datasets directly into Cloud Firestore database structure.
              </DialogDescription>
            </div>
            {step !== 'importing' && (
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 min-h-0">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: UPLOAD */}
            {step === 'upload' && (
              <motion.div
                key="upload-step"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 flex flex-col items-center justify-center py-8"
              >
                <div 
                  className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                    isDragActive 
                      ? "border-primary bg-primary/5 scale-102 shadow-lg" 
                      : "border-border/60 hover:border-primary/50 hover:bg-muted/10 bg-card/20"
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-sm">
                    <Upload className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Drag & drop your CSV file here</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                    Only .csv spreadsheets are supported. Make sure the first line has column titles.
                  </p>
                  <Button variant="outline" className="mt-6 bg-background shadow-xs hover:bg-muted border-primary/10">
                    Browse File System
                  </Button>
                </div>
                
                <div className="w-full max-w-xl border border-primary/10 bg-primary/5 rounded-2xl p-5 flex gap-4 items-start">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-bold text-primary">Intelligent Auto-Mapping Included</h4>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      We automatically match standard headers like Name, Email, Country, Experience, Bio, etc. 
                      Any unrecognized fields can be dynamically registered in Firestore with a single click.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: MAPPING */}
            {step === 'mapping' && csvData && (
              <motion.div
                key="mapping-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-amber-500/10 border border-amber-200 text-amber-800 text-sm p-4 rounded-xl flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold">Review Schema Mapping</h5>
                    <p className="mt-0.5 leading-relaxed">
                      Map CSV columns to matching Firestore attributes. Make sure <strong>First Name</strong>, <strong>Last Name</strong>, and <strong>Email Address</strong> are mapped before executing the batch import.
                    </p>
                  </div>
                </div>

                <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs bg-card/30">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-muted-foreground pl-4">CSV Column Header</TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-muted-foreground">Sample Value Preview</TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-muted-foreground w-[320px]">Target DB Property</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/30">
                        {mappings.map((mapping) => {
                          const isUnmapped = mapping.targetFieldId === "create_question" || mapping.targetFieldId === "create_opp_field" || mapping.targetFieldId === "skip"
                          const isRequiredMapped = CORE_FIELDS.find(f => f.id === mapping.targetFieldId)?.required
                          
                          return (
                            <TableRow key={mapping.csvHeader} className="hover:bg-muted/10 transition-colors">
                              <TableCell className="font-semibold text-sm pl-4">
                                <div className="flex flex-col gap-1">
                                  <span>{mapping.csvHeader}</span>
                                  {isUnmapped && (
                                    <span className="text-[10px] uppercase font-bold tracking-tight text-amber-600 flex items-center gap-1">
                                      ⚠️ Database Column Missing
                                    </span>
                                  )}
                                  {isRequiredMapped && (
                                    <Badge variant="secondary" className="text-[9px] w-fit px-1.5 h-4 bg-rose-50 text-rose-600 border-rose-100 font-bold uppercase">Required Key</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate font-mono">
                                {mapping.previewValues.filter(v => v !== "").join(", ") || "—"}
                              </TableCell>
                              <TableCell className="pr-4 py-3">
                                <div className="space-y-3">
                                  <Select 
                                    value={mapping.targetFieldId} 
                                    onValueChange={(val) => handleMappingChange(mapping.csvHeader, val)}
                                  >
                                    <SelectTrigger className="w-full h-9">
                                      <SelectValue placeholder="Skip Column" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      <SelectItem value="skip" className="text-muted-foreground font-medium">❌ Skip Column</SelectItem>
                                      
                                      <SelectItem value="create_question" className="text-primary font-semibold flex items-center">
                                        ✨ Create as Registration Question
                                      </SelectItem>
                                      <SelectItem value="create_opp_field" className="text-emerald-600 font-semibold flex items-center">
                                        ✨ Create as Project Field
                                      </SelectItem>

                                      <SelectItem disabled value="core_header" className="font-black text-[9px] uppercase tracking-wider text-muted-foreground border-t pt-2 mt-2">Core Database Fields</SelectItem>
                                      {CORE_FIELDS.map(f => (
                                        <SelectItem key={f.id} value={f.id}>{f.label} {f.required ? '*' : ''}</SelectItem>
                                      ))}

                                      {(dbQuestions.length > 0 || dbOppFields.length > 0) && (
                                        <SelectItem disabled value="custom_header" className="font-black text-[9px] uppercase tracking-wider text-muted-foreground border-t pt-2 mt-2">Custom Database Fields</SelectItem>
                                      )}
                                      {allDbFields.filter(f => f.isCustom).map(f => (
                                        <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {/* Config Panel if creating new field */}
                                  {(mapping.targetFieldId === "create_question" || mapping.targetFieldId === "create_opp_field") && (
                                    <div className="bg-primary/5 rounded-lg border border-primary/10 p-3 space-y-2 mt-2 text-xs">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-[10px] font-bold text-muted-foreground">Field Label</Label>
                                          <Input 
                                            className="h-7 text-xs px-2"
                                            value={mapping.newFieldLabel}
                                            onChange={(e) => handleNewFieldConfigChange(mapping.csvHeader, "newFieldLabel", e.target.value)}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[10px] font-bold text-muted-foreground">Field Type</Label>
                                          <Select 
                                            value={mapping.newFieldType}
                                            onValueChange={(val) => handleNewFieldConfigChange(mapping.csvHeader, "newFieldType", val)}
                                          >
                                            <SelectTrigger className="h-7 text-xs px-2">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="text">Short Text</SelectItem>
                                              <SelectItem value="textarea">Long Answer</SelectItem>
                                              <SelectItem value="select">Dropdown Menu</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      {mapping.newFieldType === "select" && (
                                        <div className="space-y-1">
                                          <Label className="text-[10px] font-bold text-muted-foreground">Options (comma separated)</Label>
                                          <Input 
                                            placeholder="Option A, Option B" 
                                            className="h-7 text-xs px-2"
                                            value={mapping.newFieldOptions}
                                            onChange={(e) => handleNewFieldConfigChange(mapping.csvHeader, "newFieldOptions", e.target.value)}
                                          />
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1.5 pt-1">
                                        <Checkbox 
                                          id={`req-${mapping.csvHeader}`}
                                          checked={mapping.newFieldRequired}
                                          onCheckedChange={(checked) => handleNewFieldConfigChange(mapping.csvHeader, "newFieldRequired", !!checked)}
                                          className="h-3.5 w-3.5"
                                        />
                                        <Label htmlFor={`req-${mapping.csvHeader}`} className="text-[10px] cursor-pointer">Mark field as required</Label>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {!isMappingValid && (
                  <div className="bg-rose-500/10 border border-rose-200 text-rose-800 text-sm p-4 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold">Missing Mandatory Keys</h5>
                      <p className="mt-0.5">
                        Please match the following required database fields: <strong>{missingRequiredFields.join(", ")}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: PREVIEW */}
            {step === 'preview' && csvData && (
              <motion.div
                key="preview-step"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div>
                  <h4 className="font-bold text-base mb-2">Mapped Imports Sample Preview</h4>
                  <p className="text-sm text-muted-foreground">
                    Review how the first 3 rows of CSV data will be stored. Core columns are normalized automatically.
                  </p>
                </div>

                <div className="border border-border/60 rounded-xl overflow-hidden shadow-xs bg-card/30">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          {mappings.map((m, idx) => {
                            if (m.targetFieldId === "skip") return null
                            let label = m.targetFieldId
                            if (m.targetFieldId === "create_question" || m.targetFieldId === "create_opp_field") {
                              label = m.newFieldLabel
                            } else {
                              label = allDbFields.find(f => f.id === m.targetFieldId)?.label || m.targetFieldId
                            }
                            return (
                              <TableHead key={idx} className="py-3 font-semibold text-xs uppercase text-muted-foreground px-4">
                                {label}
                              </TableHead>
                            )
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.rows.slice(0, 3).map((row, rowIdx) => (
                          <TableRow key={rowIdx} className="hover:bg-transparent">
                            {mappings.map((mapping, colIdx) => {
                              if (mapping.targetFieldId === "skip") return null
                              return (
                                <TableCell key={colIdx} className="px-4 py-3">
                                  {getMappedPreviewRowVal(row, mapping, colIdx)}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: IMPORTING */}
            {step === 'importing' && (
              <motion.div
                key="importing-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center justify-center space-y-6"
              >
                <div className="relative flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin shrink-0" />
                  <Loader2 className="absolute h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="font-bold text-lg">Migrating Records to Cloud Firestore</h4>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Processing batch transactions, normalizing data types, and mapping properties...
                  </p>
                </div>
                <div className="w-full max-w-md space-y-2">
                  <Progress value={progress} className="h-2 w-full" />
                  <p className="text-xs text-muted-foreground text-right font-mono">{progress}% Complete</p>
                </div>
              </motion.div>
            )}

            {/* STEP 5: COMPLETE */}
            {step === 'complete' && (
              <motion.div
                key="complete-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 flex flex-col items-center justify-center text-center space-y-6"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-xs"
                >
                  <CheckCircle2 className="h-10 w-10" />
                </motion.div>

                <div className="space-y-1.5">
                  <h3 className="text-2xl font-bold text-foreground">Import Complete!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Consultant records have been successfully added to your database directory.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl bg-card border rounded-2xl p-5 shadow-xs">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Total Rows</p>
                    <p className="text-xl font-bold font-mono">{importSummary.totalRows}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest text-emerald-600">Imported</p>
                    <p className="text-xl font-bold font-mono text-emerald-600">{importSummary.imported}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest text-rose-600">Skipped</p>
                    <p className="text-xl font-bold font-mono text-rose-600">{importSummary.skipped}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest text-primary">New Fields</p>
                    <p className="text-xl font-bold font-mono text-primary">
                      {importSummary.createdQuestions + importSummary.createdOppFields}
                    </p>
                  </div>
                </div>

                {importSummary.errors.length > 0 && (
                  <div className="w-full max-w-2xl border border-destructive/20 bg-destructive/5 rounded-2xl p-4 text-left space-y-2">
                    <p className="text-xs font-bold text-destructive uppercase tracking-widest flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Skip Report
                    </p>
                    <ul className="text-xs text-destructive-foreground/80 space-y-1 max-h-[120px] overflow-y-auto font-mono list-disc pl-4">
                      {importSummary.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <DialogFooter className="border-t pt-4 gap-2 flex justify-between sm:justify-between">
          <div>
            {step === 'mapping' && (
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Upload
              </Button>
            )}
            {step === 'preview' && (
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Mapping
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step === 'upload' && csvData && (
              <Button onClick={() => setStep('mapping')}>
                View Mapping Config <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 'mapping' && (
              <Button disabled={!isMappingValid} onClick={() => setStep('preview')}>
                Preview Parsed Data <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 'preview' && (
              <Button onClick={executeImport} className="bg-primary hover:bg-primary/95 text-white">
                Confirm & Import <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 'complete' && (
              <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-primary/95 text-white">
                Finish & Reload
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
