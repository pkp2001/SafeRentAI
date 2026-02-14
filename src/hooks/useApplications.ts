import { useState } from "react";
import { mockApplications } from "@/lib/mockData";
import type { Application } from "@/types";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [isLoading] = useState(false);

  const addApplication = (app: Omit<Application, "id" | "submitted_at">) => {
    const newApp: Application = {
      ...app,
      id: `app-${Date.now()}`,
      submitted_at: new Date().toISOString(),
    };
    setApplications((prev) => [newApp, ...prev]);
    return newApp;
  };

  const updateApplication = (id: string, updates: Partial<Application>) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, ...updates } : app))
    );
  };

  const deleteApplication = (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
  };

  const getByStatus = (status: Application["status"]) =>
    applications.filter((app) => app.status === status);

  return {
    applications,
    isLoading,
    addApplication,
    updateApplication,
    deleteApplication,
    getByStatus,
    stats: {
      total: applications.length,
      pending: getByStatus("pending").length,
      shortlisted: getByStatus("shortlisted").length,
      successful: getByStatus("successful").length,
      rejected: getByStatus("rejected").length,
    },
  };
}

