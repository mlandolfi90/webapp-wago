import { Button } from "@evoapi/design-system/button";
import { LogOut, Play, RefreshCw, Square } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { useInstance } from "@/contexts/InstanceContext";
import {
  useConnect,
  useConnectionQr,
  useConnectionStatus,
  useDisconnect,
  useLogout,
} from "@/lib/queries/go/connection";
import { TOKEN_ID } from "@/lib/queries/token";

function Connection() {
  const { t } = useTranslation();
  const { instance } = useInstance();
  const qc = useQueryClient();

  useEffect(() => {
    if (instance?.token) {
      localStorage.setItem(TOKEN_ID.INSTANCE_TOKEN, instance.token);
    }
  }, [instance?.token]);

  const instanceToken = instance?.token ?? null;
  const { data: status, refetch } = useConnectionStatus(instanceToken);
  const connected = Boolean(status?.Connected);
  const { data: qr } = useConnectionQr(instanceToken, connected);

  const connectMut = useConnect();
  const disconnectMut = useDisconnect();
  const logoutMut = useLogout();

  const onConnect = async () => {
    try {
      await connectMut.mutateAsync();
      toast.success(t("connection.connectingOk", { defaultValue: "Conexión iniciada." }));
      qc.invalidateQueries({ queryKey: ["connection"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al conectar");
    }
  };

  const onDisconnect = async () => {
    try {
      await disconnectMut.mutateAsync();
      toast.success(t("connection.disconnectOk", { defaultValue: "Sesión desconectada." }));
      qc.invalidateQueries({ queryKey: ["connection"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const onLogout = async () => {
    try {
      await logoutMut.mutateAsync();
      toast.success(t("connection.logoutOk", { defaultValue: "Sesión cerrada." }));
      qc.invalidateQueries({ queryKey: ["connection"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const qrSrc = qr?.Qrcode
    ? qr.Qrcode.startsWith("data:")
      ? qr.Qrcode
      : `data:image/png;base64,${qr.Qrcode}`
    : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("connection.title", { defaultValue: "Conexión a WhatsApp" })}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("connection.subtitle", { defaultValue: "Estado de la sesión, QR para vincular y controles." })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              connected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
            data-testid="connection-badge">
            {connected
              ? t("connection.statusConnected", { defaultValue: "Conectada" })
              : t("connection.statusDisconnected", { defaultValue: "Desconectada" })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="bg-card rounded-lg border p-6">
        {connected ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              {t("connection.loggedInAs", { defaultValue: "Sesión activa como:" })}
            </p>
            <p className="font-mono text-sm break-all">{status?.myJid || "—"}</p>
            {status?.Name && (
              <p className="text-sm">
                {t("connection.profileName", { defaultValue: "Nombre" })}: <strong>{status.Name}</strong>
              </p>
            )}
          </div>
        ) : qrSrc ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <img
              src={qrSrc}
              alt="QR"
              className="border-border h-64 w-64 rounded-lg border bg-white p-2"
              data-testid="qr-image"
            />
            <p className="text-muted-foreground text-center text-xs">
              {t("connection.qrHint", {
                defaultValue:
                  "Escaneá este QR con WhatsApp → Configuración → Dispositivos vinculados → Vincular dispositivo.",
              })}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            {t("connection.waitingForQr", { defaultValue: "Presioná Conectar para generar el QR." })}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onLogout} disabled={!connected || logoutMut.isPending}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("connection.logoutAction", { defaultValue: "Cerrar sesión" })}
        </Button>
        <Button variant="ghost" onClick={onDisconnect} disabled={!connected || disconnectMut.isPending}>
          <Square className="mr-2 h-4 w-4" />
          {t("connection.disconnectAction", { defaultValue: "Desconectar" })}
        </Button>
        <Button onClick={onConnect} disabled={connected || connectMut.isPending}>
          <Play className="mr-2 h-4 w-4" />
          {t("connection.connectAction", { defaultValue: "Conectar" })}
        </Button>
      </div>
    </div>
  );
}

export { Connection };
