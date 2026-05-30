import { useQuery } from "@tanstack/react-query";

import { api } from "../../api";
import { UseQueryParams } from "../../types";

import { MultiWebhook } from "./types";

// Las llamadas /webhook usan el TOKEN de la instancia (auth scoped),
// no la GLOBAL_API_KEY. El cliente `api` lo toma desde el storage
// (TOKEN_ID.INSTANCE_TOKEN) — el InstanceContext debe haberlo seteado
// con `setInstanceToken()` antes de que estos hooks se monten.

interface Response {
  data: MultiWebhook[];
  message: string;
}

const queryKey = (instanceToken: string | null) => [
  "webhook",
  "fetchMultiWebhooks",
  "go",
  instanceToken,
];

export const fetchMultiWebhooks = async (): Promise<MultiWebhook[]> => {
  const response = await api.get<Response>("/webhook");
  return response.data.data;
};

export const useFetchMultiWebhooks = (
  props: UseQueryParams<MultiWebhook[]> & { instanceToken: string | null },
) => {
  const { instanceToken, enabled, ...rest } = props;
  return useQuery<MultiWebhook[]>({
    ...rest,
    queryKey: queryKey(instanceToken),
    queryFn: fetchMultiWebhooks,
    enabled: !!instanceToken && (enabled ?? true),
  });
};
