import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../api";

import { MultiWebhook, MultiWebhookInput } from "./types";

interface Response {
  data: MultiWebhook;
  message: string;
}

export const useCreateMultiWebhook = (instanceToken: string | null) => {
  const qc = useQueryClient();
  return useMutation<MultiWebhook, Error, MultiWebhookInput>({
    mutationFn: async (input) => {
      const response = await api.post<Response>("/webhook", input);
      return response.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook", "fetchMultiWebhooks", "go", instanceToken] });
    },
  });
};

export const useUpdateMultiWebhook = (instanceToken: string | null) => {
  const qc = useQueryClient();
  return useMutation<MultiWebhook, Error, { id: string; input: MultiWebhookInput }>({
    mutationFn: async ({ id, input }) => {
      const response = await api.put<Response>(`/webhook/${id}`, input);
      return response.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook", "fetchMultiWebhooks", "go", instanceToken] });
    },
  });
};

export const useDeleteMultiWebhook = (instanceToken: string | null) => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/webhook/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook", "fetchMultiWebhooks", "go", instanceToken] });
    },
  });
};
