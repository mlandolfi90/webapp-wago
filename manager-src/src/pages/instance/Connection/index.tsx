import { Button } from "@evoapi/design-system/button";
import { Copy, KeyRound, LogOut, Play, RefreshCw, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { Input } from "@/components/ui/input";

import { useInstance } from "@/contexts/InstanceContext";
import {
  useConnect,
  useConnectionQr,
  useConnectionStatus,
  useDisconnect,
  useLogout,
  usePair,
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
  // `Connected` del backend wago devuelve true aún sin sesión real
  // (refleja TCP, no sesión WhatsApp). `LoggedIn` es el estado real
  // de la sesión vinculada — lo usamos para mostrar la UI de pareo.
  const loggedIn = Boolean(status?.LoggedIn);
  const connected = loggedIn;
  const { data: qr } = useConnectionQr(instanceToken, connected);

  const connectMut = useConnect();
  const disconnectMut = useDisconnect();
  const logoutMut = useLogout();
  const pairMut = usePair();
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const onRequestPair = async () => {
    if (!phone.trim()) return;
    try {
      const code = await pairMut.mutateAsync(phone.trim());
      if (!code) {
        // El backend responde 200 con PairingCode:"" si el cliente
        // whatsmeow no está vivo. Hint al usuario.
        toast.error(
          t("connection.pairNoCode", {
            defaultValue: "El backend no devolvió código. Probá Conectar primero y reintentá.",
          }),
        );
        setPairingCode(null);
        return;
      }
      setPairingCode(code);
      toast.success(t("connection.pairOk", { defaultValue: "Código generado." }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error generando código");
    }
  };

  const copyCode = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      toast.success(t("connection.codeCopied", { defaultValue: "Código copiado." }));
    } catch {
      /* clipboard puede fallar sin permisos */
    }
  };

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

      {!connected && (
        <div className="bg-card rounded-lg border p-6" data-testid="pair-by-phone">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="text-primary h-4 w-4" />
            <h2 className="text-lg font-semibold">
              {t("connection.pairByPhoneTitle", { defaultValue: "Vincular por número de teléfono" })}
            </h2>
          </div>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("connection.pairByPhoneSubtitle", {
              defaultValue:
                "Alternativa al QR: ingresá el número en formato WhatsApp y obtené un código de 8 caracteres para tipear en el teléfono.",
            })}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="pairPhone"
              type="tel"
              inputMode="numeric"
              placeholder="5491100000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
              className="sm:flex-1"
            />
            <Button onClick={onRequestPair} disabled={!phone.trim() || pairMut.isPending}>
              <KeyRound className="mr-2 h-4 w-4" />
              {pairMut.isPending
                ? t("connection.pairGenerating", { defaultValue: "Generando…" })
                : t("connection.pairAction", { defaultValue: "Generar código" })}
            </Button>
          </div>
          {pairingCode && (
            <div className="mt-4 flex items-center gap-3 rounded-md border border-dashed p-4" data-testid="pairing-code-box">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs">
                  {t("connection.pairCodeLabel", { defaultValue: "Tipeá este código en tu WhatsApp:" })}
                </p>
                <p
                  className="font-mono text-2xl font-bold tracking-widest"
                  data-testid="pairing-code-value"
                >
                  {pairingCode}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={copyCode} aria-label={t("connection.copyCode", { defaultValue: "Copiar" })}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            {t("connection.pairByPhoneHint", {
              defaultValue:
                "En WhatsApp: Configuración → Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono.",
            })}
          </p>
        </div>
      )}

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
