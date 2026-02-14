import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import confetti from "canvas-confetti";
import {
  User, FileText, CheckCircle, ArrowLeft, ArrowRight, Upload,
  Loader2, Sparkles, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { generateCoverLetter } from "@/lib/openai";
import { formatCurrency } from "@/lib/utils";
import type { SavedListing } from "@/types";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(8, "Valid phone number required"),
  current_address: z.string().min(5, "Address is required"),
  employment_status: z.string().min(1, "Select employment status"),
  income_source: z.string().min(1, "Select income source"),
  monthly_income: z.number().min(1, "Income is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ApplicationWizardProps {
  listing?: SavedListing;
  onSubmit?: () => void;
}

const steps = [
  { id: 1, label: "Profile", icon: User },
  { id: 2, label: "Documents", icon: FileText },
  { id: 3, label: "Review", icon: CheckCircle },
];

export function ApplicationWizard({ listing, onSubmit }: ApplicationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState<{ [key: string]: File | null }>({
    identity: null,
    income: null,
    rental: null,
  });
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    getValues,
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      current_address: "",
      employment_status: "",
      income_source: "",
      monthly_income: 0,
    },
  });

  const watchedValues = watch();

  const handleFileUpload = (key: string, file: File | null) => {
    setDocuments((prev) => ({ ...prev, [key]: file }));
  };

  const handleGenerateCoverLetter = async () => {
    setIsGenerating(true);
    try {
      const values = getValues();
      const letter = await generateCoverLetter(
        {
          full_name: values.full_name,
          email: values.email,
          phone: values.phone,
          employment_status: values.employment_status,
          income_source: values.income_source,
          monthly_income: values.monthly_income,
        } as any,
        listing?.property_address || "the property",
        listing?.rent_amount || 0
      );
      setCoverLetter(letter);
    } catch {
      setCoverLetter("Failed to generate cover letter. Please write one manually.");
    }
    setIsGenerating(false);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ["#10B981", "#3B82F6", "#60A5FA", "#34D399"],
    });
    onSubmit?.();
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-16"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.2, damping: 10 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-success-500 to-success-600 mx-auto mb-6 flex items-center justify-center"
        >
          <Check className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-3">Application Submitted! 🎉</h2>
        <p className="text-dark-500 mb-2">Your application has been sent successfully</p>
        <p className="text-sm text-dark-400 mb-8">
          Application ID: APP-{Date.now().toString(36).toUpperCase()}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => window.location.href = "/dashboard"}>
            View in Dashboard
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/search"}>
            Apply to Another
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-success-500 text-white"
                      : isCurrent
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                      : "bg-dark-100 text-dark-400"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isCurrent ? "text-primary-500" : isCompleted ? "text-success-500" : "text-dark-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 rounded-full transition-colors ${
                    isCompleted ? "bg-success-500" : "bg-dark-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Property Info */}
      {listing && (
        <div className="mb-6 p-4 rounded-xl bg-dark-50 border border-dark-200 flex items-center gap-4">
          <img
            src={listing.image_url}
            alt={listing.property_address}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div>
            <p className="font-semibold text-sm">{listing.property_address}</p>
            <p className="text-sm text-dark-500">
              {formatCurrency(listing.rent_amount)}/week · {listing.bedrooms} bed · {listing.bathrooms} bath
            </p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input {...register("full_name")} placeholder="John Smith" />
                {errors.full_name && (
                  <p className="text-xs text-danger-500">{errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input {...register("email")} type="email" placeholder="john@example.com" />
                {errors.email && (
                  <p className="text-xs text-danger-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input {...register("phone")} placeholder="0412 345 678" />
                {errors.phone && (
                  <p className="text-xs text-danger-500">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Employment Status *</Label>
                <Select
                  value={watchedValues.employment_status}
                  onValueChange={(v) => setValue("employment_status", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Employed", "Unemployed", "Student", "Retired", "Centrelink"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employment_status && (
                  <p className="text-xs text-danger-500">{errors.employment_status.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current Address *</Label>
              <Textarea {...register("current_address")} placeholder="Your current address" rows={2} />
              {errors.current_address && (
                <p className="text-xs text-danger-500">{errors.current_address.message}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Income Source *</Label>
                <Select
                  value={watchedValues.income_source}
                  onValueChange={(v) => setValue("income_source", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Centrelink JobSeeker", "Youth Allowance", "Age Pension",
                      "Disability Support", "Part-time Salary", "Full-time Salary",
                      "Casual Work", "Other",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Income ($) *</Label>
                <Input
                  type="number"
                  {...register("monthly_income", { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.monthly_income && (
                  <p className="text-xs text-danger-500">{errors.monthly_income.message}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {[
              { key: "identity", label: "Proof of Identity", desc: "Driver's License or Passport", required: true },
              { key: "income", label: "Proof of Income", desc: "Centrelink statement or payslips", required: true },
              { key: "rental", label: "Rental History", desc: "Previous rental references (optional)", required: false },
            ].map((doc) => (
              <div
                key={doc.key}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
                  documents[doc.key]
                    ? "border-success-300 bg-success-50"
                    : "border-dark-200 hover:border-primary-300 hover:bg-primary-50/30"
                }`}
              >
                {documents[doc.key] ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                        <Check className="w-5 h-5 text-success-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{documents[doc.key]!.name}</p>
                        <p className="text-xs text-dark-400">
                          {(documents[doc.key]!.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFileUpload(doc.key, null)}
                      className="p-2 rounded-lg hover:bg-dark-100"
                    >
                      <X className="w-4 h-4 text-dark-400" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-dark-300 mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">
                      {doc.label} {doc.required && <span className="text-danger-500">*</span>}
                    </p>
                    <p className="text-xs text-dark-400 mb-3">{doc.desc}</p>
                    <p className="text-xs text-dark-300">PDF, JPG, PNG · Max 5MB</p>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleFileUpload(doc.key, file);
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* AI Cover Letter */}
            <div className="rounded-xl border border-dark-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                  AI Cover Letter
                </h3>
                <Button
                  size="sm"
                  onClick={handleGenerateCoverLetter}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      Writing...
                    </>
                  ) : coverLetter ? (
                    "Regenerate"
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
              <Textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Click 'Generate' to create an AI-powered cover letter, or write your own..."
                rows={10}
                className="resize-y"
              />
              {coverLetter && (
                <p className="text-xs text-dark-400 mt-2">
                  {coverLetter.split(/\s+/).length} words
                </p>
              )}
            </div>

            {/* Review Summary */}
            <div className="rounded-xl border border-dark-200 divide-y divide-dark-200">
              <div className="p-4">
                <h4 className="text-sm font-semibold text-dark-500 mb-2">Personal Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-dark-400">Name:</span>
                  <span>{watchedValues.full_name || "—"}</span>
                  <span className="text-dark-400">Email:</span>
                  <span>{watchedValues.email || "—"}</span>
                  <span className="text-dark-400">Phone:</span>
                  <span>{watchedValues.phone || "—"}</span>
                  <span className="text-dark-400">Income:</span>
                  <span>{formatCurrency(watchedValues.monthly_income || 0)}/month</span>
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-sm font-semibold text-dark-500 mb-2">Documents</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(documents).map(([key, file]) => (
                    <div key={key} className="flex items-center gap-2">
                      {file ? (
                        <Check className="w-4 h-4 text-success-500" />
                      ) : (
                        <X className="w-4 h-4 text-dark-300" />
                      )}
                      <span className="capitalize">{key}:</span>
                      <span className="text-dark-400">{file?.name || "Not uploaded"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Confirmation */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-50">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <label className="text-sm text-dark-600 cursor-pointer" onClick={() => setConfirmed(!confirmed)}>
                I confirm all information provided is accurate and I authorize SafeRent AI to submit
                this application on my behalf.
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-200">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={() => {
              if (currentStep === 1) {
                handleSubmit(() => setCurrentStep(2))();
              } else {
                setCurrentStep((prev) => prev + 1);
              }
            }}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleFinalSubmit}
            disabled={!confirmed || isSubmitting}
            className="min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

