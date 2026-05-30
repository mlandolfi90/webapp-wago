import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@evoapi/design-system/button";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useInstance } from "@/contexts/InstanceContext";

import {
  useCreateMultiWebhook,
  useDeleteMultiWebhook,
  useUpdateMultiWebhook,
} from "@/lib/queries/go/multiWebhook/manageMultiWebhook";
import { useFetchMultiWebhooks } from "@/lib/queries/go/multiWebhook/fetchMultiWebhooks";
import type { MultiWebhook, MultiWebhookInput } from "@/lib/queries/go/multiWebhook/types";
import { TOKEN_ID } from "@/lib/queries/token";

// Eventos del backend Go (pkg/internal/event_types/event_types.go).
// Lista en MAYÚSCULAS para coincidir con la validación del backend.
const KNOWN_EVENTS = [
  "MESSAGE",
  "SEND_MESSAGE",
  "READ_RECEIPT",
  "PRESENCE",
  "HISTORY_SYNC",
  "CHAT_PRESENCE",
  "CALL",
  "CONNECTION",
  "LABEL",
  "CONTACT",
  "GROUP",
  "NEWSLETTER",
  "QRCODE",
  "BUTTON_CLICK",
];
const ALL_EVENT = "ALL";

const formSchema = z.object({
  url: z.string().url("URL inválida"),
  enabled: z.boolean(),
  ignoreFromMe: z.boolean(),
  eventsText: z.string(),
  chatType: z.enum(["any", "group", "individual"]),
  chatIdsText: z.string(),
  sendersText: z.string(),
  chatNamesText: z.string(),
  senderNamesText: z.string(),
  rabbitmqEnable: z.boolean(),
  websocketEnable: z.boolean(),
  natsEnable: z.boolean(),
});
type FormSchema = z.infer<typeof formSchema>;

function textToList(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

function listToText(list: string[] | null | undefined): string {
  return (list ?? []).join("\n");
}

function summarizeFilter(w: MultiWebhook, t: (k: string, opts?: Record<string, unknown>) => string): string {
  const parts: string[] = [];
  if (w.chatIds?.length) parts.push(`${w.chatIds.length} ${t("webhook.chatIds", { defaultValue: "chats" })}`);
  if (w.chatNames?.length) parts.push(`${w.chatNames.length} ${t("webhook.chatNames", { defaultValue: "nombres chat" })}`);
  if (w.senders?.length) parts.push(`${w.senders.length} ${t("webhook.senders", { defaultValue: "remitentes" })}`);
  if (w.senderNames?.length) parts.push(`${w.senderNames.length} ${t("webhook.senderNames", { defaultValue: "nombres remitente" })}`);
  return parts.length ? parts.join(", ") : t("webhook.noFilters", { defaultValue: "sin filtros" });
}

function Webhook() {
  const { t } = useTranslation();
  const { instance } = useInstance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MultiWebhook | null>(null);

  // ADR 0045+: las llamadas /webhook usan el token de la instancia
  // (no GLOBAL_API_KEY). Lo seteamos en localStorage cuando el instance
  // está disponible para que el interceptor de axios (api.ts) lo use.
  useEffect(() => {
    if (instance?.token) {
      localStorage.setItem(TOKEN_ID.INSTANCE_TOKEN, instance.token);
    }
  }, [instance?.token]);

  const instanceToken = instance?.token ?? null;
  const { data: webhooks = [], isLoading } = useFetchMultiWebhooks({ instanceToken });
  const createMut = useCreateMultiWebhook(instanceToken);
  const updateMut = useUpdateMultiWebhook(instanceToken);
  const deleteMut = useDeleteMultiWebhook(instanceToken);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      enabled: true,
      ignoreFromMe: true,
      eventsText: KNOWN_EVENTS.join("\n"),
      chatType: "any",
      chatIdsText: "",
      sendersText: "",
      chatNamesText: "",
      senderNamesText: "",
      rabbitmqEnable: false,
      websocketEnable: false,
      natsEnable: false,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      url: "",
      enabled: true,
      ignoreFromMe: true,
      eventsText: KNOWN_EVENTS.join("\n"),
      chatType: "any",
      chatIdsText: "",
      sendersText: "",
      chatNamesText: "",
      senderNamesText: "",
      rabbitmqEnable: false,
      websocketEnable: false,
      natsEnable: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (w: MultiWebhook) => {
    setEditing(w);
    const evs = w.events ?? [];
    form.reset({
      url: w.url,
      enabled: w.enabled,
      ignoreFromMe: w.ignoreFromMe,
      eventsText: evs.length === 0 ? ALL_EVENT : evs.join("\n"),
      chatType: w.chatType,
      chatIdsText: listToText(w.chatIds),
      sendersText: listToText(w.senders),
      chatNamesText: listToText(w.chatNames),
      senderNamesText: listToText(w.senderNames),
      rabbitmqEnable: w.rabbitmqEnable ?? false,
      websocketEnable: w.websocketEnable ?? false,
      natsEnable: w.natsEnable ?? false,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormSchema) => {
    const eventsList = data.eventsText.trim() === ALL_EVENT ? [] : textToList(data.eventsText);
    const input: MultiWebhookInput = {
      url: data.url.trim(),
      enabled: data.enabled,
      ignoreFromMe: data.ignoreFromMe,
      events: eventsList,
      chatType: data.chatType,
      chatIds: textToList(data.chatIdsText),
      senders: textToList(data.sendersText),
      chatNames: textToList(data.chatNamesText),
      senderNames: textToList(data.senderNamesText),
      rabbitmqEnable: data.rabbitmqEnable,
      websocketEnable: data.websocketEnable,
      natsEnable: data.natsEnable,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, input });
        toast.success(t("webhook.updateOk", { defaultValue: "Webhook actualizado" }));
      } else {
        await createMut.mutateAsync(input);
        toast.success(t("webhook.createOk", { defaultValue: "Webhook creado" }));
      }
      setDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      toast.error(msg);
    }
  };

  const onDelete = async (w: MultiWebhook) => {
    if (!window.confirm(t("webhook.deleteConfirm", { defaultValue: `¿Borrar webhook ${w.url}?` }))) return;
    try {
      await deleteMut.mutateAsync(w.id);
      toast.success(t("webhook.deleteOk", { defaultValue: "Webhook borrado" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo borrar";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("webhook.title", { defaultValue: "Webhooks" })}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("webhook.subtitle", {
              defaultValue: "N webhooks por instancia, cada uno con su filtro embebido (ADR 0045+).",
            })}
          </p>
        </div>
        <Button onClick={openCreate} data-testid="webhook-add">
          <Plus className="mr-2 h-4 w-4" />
          {t("webhook.add", { defaultValue: "Agregar webhook" })}
        </Button>
      </header>

      <div className="rounded-lg border bg-card p-4">
        {isLoading ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("common.loading", { defaultValue: "Cargando…" })}
          </p>
        ) : webhooks.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("webhook.empty", { defaultValue: "Sin webhooks. Agregá el primero." })}
          </p>
        ) : (
          <ul className="divide-border divide-y" data-testid="webhook-list">
            {webhooks.map((w) => (
              <li key={w.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-sm">{w.url}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        w.enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}>
                      {w.enabled
                        ? t("webhook.statusOn", { defaultValue: "Activo" })
                        : t("webhook.statusOff", { defaultValue: "Inactivo" })}
                    </span>
                    {w.chatType !== "any" && (
                      <span className="rounded-full border px-2 py-0.5 text-xs">
                        {t(`webhook.chatType.${w.chatType}`, { defaultValue: w.chatType })}
                      </span>
                    )}
                    {(w.rabbitmqEnable || w.websocketEnable || w.natsEnable) && (
                      <span className="rounded-full border border-blue-500 px-2 py-0.5 text-xs text-blue-500">
                        {[w.rabbitmqEnable && "RMQ", w.websocketEnable && "WS", w.natsEnable && "NATS"]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {(w.events ?? []).length === 0
                      ? t("webhook.allEvents", { defaultValue: "todos los eventos" })
                      : `${(w.events ?? []).length} ${t("webhook.events", { defaultValue: "eventos" })}`}
                    {" · "}
                    {summarizeFilter(w, t)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(w)} aria-label={t("webhook.edit", { defaultValue: "Editar" })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(w)} aria-label={t("webhook.delete", { defaultValue: "Borrar" })}>
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground mt-4 text-xs">
          {t("webhook.tokenHint", {
            defaultValue: "Las llamadas a /webhook usan el token de la instancia (no la GLOBAL_API_KEY).",
          })}
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("webhook.editTitle", { defaultValue: "Editar webhook" })
                : t("webhook.createTitle", { defaultValue: "Nuevo webhook" })}
            </DialogTitle>
            <DialogDescription>
              {t("webhook.dialogSubtitle", {
                defaultValue: "URL + Eventos + Filtros. El backend dispara solo si TODO el filtro matchea.",
              })}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="webhookUrl" className="text-sm font-medium">{t("webhook.fields.url", { defaultValue: "URL" })}</label>
                <Input id="webhookUrl" type="url" placeholder="https://example.com/webhook" {...form.register("url")} />
                {form.formState.errors.url && <p className="text-destructive text-xs">{form.formState.errors.url.message}</p>}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <ToggleField name="enabled" label={t("webhook.fields.enabled", { defaultValue: "Habilitado" })} form={form} />
                <ToggleField name="ignoreFromMe" label={t("webhook.fields.ignoreFromMe", { defaultValue: "Ignorar mis propios mensajes" })} form={form} />
              </div>

              <div className="space-y-2">
                <label htmlFor="webhookEvents" className="text-sm font-medium">{t("webhook.fields.events", { defaultValue: "Eventos" })}</label>
                <Textarea id="webhookEvents" rows={4} {...form.register("eventsText")} />
                <p className="text-muted-foreground text-xs">
                  {t("webhook.fields.eventsHint", { defaultValue: "Uno por línea. Vacío o 'ALL' = todos los eventos del backend." })}
                </p>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <h4 className="text-sm font-medium">{t("webhook.filterSection", { defaultValue: "Filtro (a quién dispara)" })}</h4>
                <div className="space-y-2">
                  <label htmlFor="chatType" className="text-sm font-medium">{t("webhook.fields.chatType", { defaultValue: "Tipo de chat" })}</label>
                  <select
                    id="chatType"
                    className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                    {...form.register("chatType")}>
                    <option value="any">{t("webhook.chatType.any", { defaultValue: "Todos" })}</option>
                    <option value="group">{t("webhook.chatType.group", { defaultValue: "Grupos" })}</option>
                    <option value="individual">{t("webhook.chatType.individual", { defaultValue: "Individuales" })}</option>
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <FilterField name="chatIdsText" label={t("webhook.fields.chatIds", { defaultValue: "Chat JIDs (allowlist)" })} placeholder="549*@s.whatsapp.net" form={form} />
                  <FilterField name="chatNamesText" label={t("webhook.fields.chatNames", { defaultValue: "Nombres chat (glob)" })} placeholder="Harness*" form={form} />
                  <FilterField name="sendersText" label={t("webhook.fields.senders", { defaultValue: "Sender JIDs (allowlist)" })} placeholder="549...@s.whatsapp.net" form={form} />
                  <FilterField name="senderNamesText" label={t("webhook.fields.senderNames", { defaultValue: "Nombres remitente (glob)" })} placeholder="Juan*" form={form} />
                </div>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <h4 className="text-sm font-medium">{t("webhook.transportsSection", { defaultValue: "Transports adicionales (ADR 0055)" })}</h4>
                <p className="text-muted-foreground text-xs">
                  {t("webhook.transportsHint", {
                    defaultValue: "Además del POST HTTP a URL, despacha a los transports globales configurados.",
                  })}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <ToggleField name="rabbitmqEnable" label="RabbitMQ" form={form} />
                  <ToggleField name="websocketEnable" label="WebSocket" form={form} />
                  <ToggleField name="natsEnable" label="NATS" form={form} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel", { defaultValue: "Cancelar" })}
                </Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {createMut.isPending || updateMut.isPending
                    ? t("common.saving", { defaultValue: "Guardando…" })
                    : t("common.save", { defaultValue: "Guardar" })}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleField({ name, label, form }: { name: keyof FormSchema; label: string; form: ReturnType<typeof useForm<FormSchema>> }) {
  const checked = form.watch(name) as boolean;
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => form.setValue(name, e.target.checked as never)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}

function FilterField({ name, label, placeholder, form }: { name: keyof FormSchema; label: string; placeholder: string; form: ReturnType<typeof useForm<FormSchema>> }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Textarea rows={3} placeholder={placeholder} {...form.register(name as never)} />
      <p className="text-muted-foreground text-xs">
        {placeholder.includes("*") ? "Uno por línea. Soporta wildcards (*)." : "Uno por línea."}
      </p>
    </div>
  );
}

export { Webhook };
