import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  User, FileText, Settings, Lock, Save, Loader2, Upload,
  Trash2, Download, Bell, Eye, Moon, Shield, AlertTriangle, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import {
  getProfile,
  upsertProfile,
  getDocuments,
  uploadDocument,
  deleteDocument,
  type DocumentRecord,
} from "@/lib/supabaseDb";
import toast from "react-hot-toast";

const tabs = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "security", label: "Security", icon: Lock },
];

export default function Profile() {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("personal");

  // ─── Profile data ───────────────────────────────
  const { data: dbProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    current_address: "",
    employment_status: "",
    income_source: "",
    monthly_income: 0,
  });

  // Sync local form state when DB data arrives
  useEffect(() => {
    if (dbProfile) {
      setProfile({
        full_name: dbProfile.full_name || "",
        email: dbProfile.email || "",
        phone: dbProfile.phone || "",
        current_address: dbProfile.current_address || "",
        employment_status: dbProfile.employment_status || "",
        income_source: dbProfile.income_source || "",
        monthly_income: dbProfile.monthly_income || 0,
      });
    }
  }, [dbProfile]);

  const saveMutation = useMutation({
    mutationFn: () => upsertProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Changes saved successfully");
    },
    onError: () => toast.error("Failed to save changes"),
  });

  const handleSave = () => saveMutation.mutate();

  // ─── Documents data ─────────────────────────────
  const { data: documents, isLoading: docsLoading } = useQuery<DocumentRecord[]>({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) =>
      uploadDocument(file, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded");
    },
    onError: () => toast.error("Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (doc: DocumentRecord) => deleteDocument(doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) uploadMutation.mutate({ file, type: "other" });
    };
    input.click();
  };

  // ─── Settings state (local — not persisted) ─────
  const [settings, setSettings] = useState({
    emailNotifications: true,
    statusUpdates: true,
    newListings: false,
    weeklyDigest: true,
    defaultView: "grid",
  });

  const isSaving = saveMutation.isPending;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2 dark:text-dark-100">Profile</h1>
        <p className="text-dark-500 dark:text-dark-300">Manage your account and preferences</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tab Navigation */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                    : "text-dark-500 hover:bg-dark-50 dark:text-dark-400 dark:hover:bg-dark-800"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-700 shadow-sm p-6 sm:p-8"
          >
            {/* Personal Info Tab */}
            {activeTab === "personal" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold dark:text-dark-100">Personal Information</h2>
                {profileLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={profile.full_name}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Employment Status</Label>
                        <Select
                          value={profile.employment_status}
                          onValueChange={(v) => setProfile({ ...profile, employment_status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["Employed", "Unemployed", "Student", "Retired", "Centrelink"].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Current Address</Label>
                      <Textarea
                        value={profile.current_address}
                        onChange={(e) => setProfile({ ...profile, current_address: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Income Source</Label>
                        <Select
                          value={profile.income_source}
                          onValueChange={(v) => setProfile({ ...profile, income_source: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                        <Label>Monthly Income ($)</Label>
                        <Input
                          type="number"
                          value={profile.monthly_income}
                          onChange={(e) => setProfile({ ...profile, monthly_income: +e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-dark-100 dark:border-dark-700">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                        ) : (
                          <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold dark:text-dark-100">Documents</h2>
                  <Button size="sm" onClick={handleUpload} disabled={uploadMutation.isPending}>
                    {uploadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload New
                  </Button>
                </div>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : (documents || []).length > 0 ? (
                  <div className="space-y-3">
                    {(documents || []).map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-dark-100 dark:border-dark-700 hover:border-dark-200 dark:hover:border-dark-600 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium dark:text-dark-200">{doc.file_name}</p>
                            <p className="text-xs text-dark-400 dark:text-dark-500">
                              {doc.document_type} · {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : "Unknown size"} · {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger-500 hover:text-danger-600"
                            onClick={() => deleteMutation.mutate(doc)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-dark-300 dark:text-dark-600 mx-auto mb-3" />
                    <p className="text-sm text-dark-500 dark:text-dark-400">No documents uploaded yet</p>
                    <p className="text-xs text-dark-400 dark:text-dark-500 mt-1">Upload your ID, income proof, and references</p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold dark:text-dark-100">Settings</h2>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-dark-500 dark:text-dark-300 flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Notifications
                  </h3>
                  {[
                    { key: "emailNotifications", label: "Email notifications" },
                    { key: "statusUpdates", label: "Application status updates" },
                    { key: "newListings", label: "New matching listings" },
                    { key: "weeklyDigest", label: "Weekly digest" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <span className="text-sm dark:text-dark-200">{item.label}</span>
                      <Switch
                        checked={(settings as any)[item.key]}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, [item.key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t border-dark-100 dark:border-dark-700 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-dark-500 dark:text-dark-300 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Display
                  </h3>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-dark-400" />
                      <span className="text-sm dark:text-dark-200">Dark mode</span>
                    </div>
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={toggleTheme}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-dark-100 dark:border-dark-700">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save Preferences</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold dark:text-dark-100">Security</h2>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-dark-500 dark:text-dark-300">Change Password</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <Button onClick={handleSave}>Update Password</Button>
                  </div>
                </div>

                <div className="border-t border-dark-100 dark:border-dark-700 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-dark-500 dark:text-dark-300">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50 dark:bg-dark-700">
                    <div>
                      <p className="text-sm font-medium dark:text-dark-200">2FA is not enabled</p>
                      <p className="text-xs text-dark-400 dark:text-dark-500">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Shield className="w-4 h-4 mr-2" />
                      Enable
                    </Button>
                  </div>
                </div>

                <div className="border-t border-dark-100 dark:border-dark-700 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-danger-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Danger Zone
                  </h3>
                  <div className="p-4 rounded-xl border border-danger-200 dark:border-danger-700 bg-danger-50/50 dark:bg-danger-700/10">
                    <p className="text-sm font-medium text-danger-700 dark:text-danger-500 mb-1">Delete Account</p>
                    <p className="text-xs text-danger-600 dark:text-danger-500 mb-3">
                      This action is permanent and cannot be undone. All your data will be deleted.
                    </p>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
