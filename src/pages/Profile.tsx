import { useState } from "react";
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
import toast from "react-hot-toast";

const tabs = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "security", label: "Security", icon: Lock },
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "John Smith",
    email: "john@example.com",
    phone: "0412 345 678",
    current_address: "123 Example Street, Sydney NSW 2000",
    employment_status: "Centrelink",
    income_source: "Centrelink JobSeeker",
    monthly_income: 1200,
  });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    statusUpdates: true,
    newListings: false,
    weeklyDigest: true,
    darkMode: false,
    defaultView: "grid",
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
    toast.success("Changes saved successfully");
  };

  const mockDocuments = [
    { id: "1", name: "Drivers_License.pdf", type: "ID", size: "1.2 MB", date: "2026-02-10" },
    { id: "2", name: "Centrelink_Statement.pdf", type: "Income", size: "856 KB", date: "2026-02-08" },
    { id: "3", name: "Rental_Reference.pdf", type: "Rental History", size: "420 KB", date: "2026-02-05" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-dark-500">Manage your account and preferences</p>
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
                    ? "bg-primary-50 text-primary-600"
                    : "text-dark-500 hover:bg-dark-50"
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
            className="bg-white rounded-2xl border border-dark-100 shadow-sm p-6 sm:p-8"
          >
            {/* Personal Info Tab */}
            {activeTab === "personal" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Personal Information</h2>
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
                <div className="flex justify-end pt-4 border-t border-dark-100">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Documents</h2>
                  <Button size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New
                  </Button>
                </div>
                <div className="space-y-3">
                  {mockDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-dark-100 hover:border-dark-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-dark-400">
                            {doc.type} · {doc.size} · {doc.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-danger-500 hover:text-danger-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Settings</h2>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-dark-500 flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Notifications
                  </h3>
                  {[
                    { key: "emailNotifications", label: "Email notifications" },
                    { key: "statusUpdates", label: "Application status updates" },
                    { key: "newListings", label: "New matching listings" },
                    { key: "weeklyDigest", label: "Weekly digest" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <span className="text-sm">{item.label}</span>
                      <Switch
                        checked={(settings as any)[item.key]}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, [item.key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t border-dark-100 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-dark-500 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Display
                  </h3>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-dark-400" />
                      <span className="text-sm">Dark mode</span>
                    </div>
                    <Switch
                      checked={settings.darkMode}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, darkMode: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-dark-100">
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
                <h2 className="text-xl font-semibold">Security</h2>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-dark-500">Change Password</h3>
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

                <div className="border-t border-dark-100 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-dark-500">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50">
                    <div>
                      <p className="text-sm font-medium">2FA is not enabled</p>
                      <p className="text-xs text-dark-400">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Shield className="w-4 h-4 mr-2" />
                      Enable
                    </Button>
                  </div>
                </div>

                <div className="border-t border-dark-100 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-danger-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Danger Zone
                  </h3>
                  <div className="p-4 rounded-xl border border-danger-200 bg-danger-50/50">
                    <p className="text-sm font-medium text-danger-700 mb-1">Delete Account</p>
                    <p className="text-xs text-danger-600 mb-3">
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

