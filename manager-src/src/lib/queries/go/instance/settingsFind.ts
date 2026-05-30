import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Instance, Settings } from "@/types/evolution.types";

import { apiGlobal } from "../../api";
import { FetchSettingsResponse } from "../../instance/types";
import { UseQueryParams } from "../../types";

interface GoAdvancedSettings {
  alwaysOnline: boolean;
  rejectCall: boolean;
  msgRejectCall: string;
  readMessages: boolean;
  ignoreGroups: boolean;
  ignoreStatus: boolean;
  // WAGO-PATCH(ADR-0049): existe en backend pkg/instance/model.
  ignoreFromMe: boolean;
}

interface GoAdvancedSettingsResponse {
  data: GoAdvancedSettings;
  message?: string;
}

export const toSettings = (go: GoAdvancedSettings): Settings => ({
  rejectCall: go.rejectCall,
  msgCall: go.msgRejectCall,
  groupsIgnore: go.ignoreGroups,
  alwaysOnline: go.alwaysOnline,
  readMessages: go.readMessages,
  readStatus: !go.ignoreStatus,
  // WAGO-PATCH(ADR-0049): default true protege contra loops cuando el
  // backend retorna instancias previas a la migración del campo.
  ignoreFromMe: go.ignoreFromMe ?? true,
});

export const toGoAdvancedSettings = (s: Settings): GoAdvancedSettings => ({
  alwaysOnline: s.alwaysOnline,
  rejectCall: s.rejectCall,
  msgRejectCall: s.msgCall ?? "",
  readMessages: s.readMessages,
  ignoreGroups: s.groupsIgnore,
  ignoreStatus: !s.readStatus,
  ignoreFromMe: s.ignoreFromMe ?? true,
});

interface IParams {
  instanceName: string | null;
  token: string;
}

const queryKey = (params: Partial<IParams>) => ["instance", "fetchSettings", "go", JSON.stringify(params)];

const resolveInstanceId = (qc: ReturnType<typeof useQueryClient>, name: string): string | undefined => {
  const list = qc.getQueryData<Instance[]>(["instance", "fetchInstances", "go"]);
  const fromList = list?.find((i) => i.name === name);
  if (fromList) return fromList.id;

  const singleEntries = qc.getQueriesData<Instance>({ queryKey: ["instance", "fetchInstance", "go"] });
  for (const [, data] of singleEntries) {
    if (data?.name === name) return data.id;
  }
  return undefined;
};

export const useFetchSettingsGo = (props: UseQueryParams<FetchSettingsResponse> & Partial<IParams>) => {
  const qc = useQueryClient();
  const { instanceName, token, enabled, ...rest } = props;

  return useQuery<FetchSettingsResponse>({
    ...rest,
    queryKey: queryKey({ instanceName, token }),
    queryFn: async () => {
      const id = resolveInstanceId(qc, instanceName!);
      if (!id) throw new Error(`Instance "${instanceName}" not found in cache`);
      const response = await apiGlobal.get<GoAdvancedSettingsResponse>(`/instance/${id}/advanced-settings`, {
        headers: { apikey: token! },
      });
      const payload = response.data?.data ?? (response.data as unknown as GoAdvancedSettings);
      return toSettings(payload);
    },
    enabled: !!instanceName && (enabled ?? true),
    retry: false,
  });
};
