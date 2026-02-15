import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApplications,
  submitApplication,
  updateApplication,
  deleteApplication,
} from "@/lib/supabaseDb";
import type { Application } from "@/types";

export function useApplications() {
  const query = useQuery<Application[]>({
    queryKey: ["applications"],
    queryFn: getApplications,
    staleTime: 2 * 60 * 1000,
  });

  const applications = query.data || [];

  const getByStatus = (status: Application["status"]) =>
    applications.filter((app) => app.status === status);

  return {
    ...query,
    applications,
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

export function useSubmitApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (app: Omit<Application, "id" | "submitted_at">) =>
      submitApplication(app),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Application>;
    }) => updateApplication(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
