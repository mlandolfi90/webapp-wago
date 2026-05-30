import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "../../api";

// Conexión a WhatsApp. Endpoints token-scoped — el INSTANCE_TOKEN del
// localStorage va automático por el interceptor de axios.

type ConnectionStatus = {
  Connected: boolean;
  LoggedIn: boolean;
  myJid: string;
  Name: string;
};

type QrResponse = {
  Qrcode: string;
  Code: string;
};

export const useConnectionStatus = (instanceToken: string | null) =>
  useQuery<ConnectionStatus>({
    queryKey: ["connection", "status", instanceToken],
    queryFn: async () => {
      const response = await api.get<{ data: ConnectionStatus; message: string }>("/instance/status");
      return response.data.data;
    },
    enabled: !!instanceToken,
    refetchInterval: (q) => (q.state.data?.Connected ? false : 3000),
  });

export const useConnectionQr = (instanceToken: string | null, connected: boolean) =>
  useQuery<QrResponse>({
    queryKey: ["connection", "qr", instanceToken],
    queryFn: async () => {
      const response = await api.get<{ data: QrResponse; message: string }>("/instance/qr");
      return response.data.data;
    },
    enabled: !!instanceToken && !connected,
    refetchInterval: connected ? false : 3000,
  });

export const useConnect = () =>
  useMutation({
    mutationFn: async () => {
      const response = await api.post("/instance/connect", { immediate: true });
      return response.data;
    },
  });

export const useDisconnect = () =>
  useMutation({
    mutationFn: async () => {
      const response = await api.post("/instance/disconnect");
      return response.data;
    },
  });

export const useLogout = () =>
  useMutation({
    mutationFn: async () => {
      const response = await api.delete("/instance/logout");
      return response.data;
    },
  });
