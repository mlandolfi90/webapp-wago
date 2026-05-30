import { Button } from "@evoapi/design-system/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useInstance } from "@/contexts/InstanceContext";
import { apiGlobal } from "@/lib/queries/api";

function DangerZone() {
  const { t } = useTranslation();
  const { instance } = useInstance();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!instance?.id) throw new Error("No instance");
      await apiGlobal.delete(`/instance/delete/${instance.id}`);
    },
    onSuccess: () => {
      toast.success(t("danger.deleteOk", { defaultValue: "Instancia borrada" }));
      qc.invalidateQueries({ queryKey: ["instance"] });
      navigate("/manager/");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-destructive text-2xl font-semibold tracking-tight">
          {t("danger.title", { defaultValue: "Zona de peligro" })}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("danger.subtitle", { defaultValue: "Acciones destructivas irreversibles." })}
        </p>
      </header>

      <div className="border-destructive/40 bg-card rounded-lg border p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-destructive mt-1 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {t("danger.deleteInstance", { defaultValue: "Borrar instancia" })}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("danger.deleteWarning", {
                defaultValue:
                  "Esta acción borra permanentemente la instancia y todos sus webhooks. No se puede deshacer.",
              })}
            </p>
            <Button variant="destructive" onClick={() => setOpen(true)} className="mt-4">
              <Trash2 className="mr-2 h-4 w-4" />
              {t("danger.deleteAction", { defaultValue: "Borrar instancia" })}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("danger.confirmTitle", { defaultValue: "Confirmar borrado" })}
            </DialogTitle>
            <DialogDescription>
              {t("danger.confirmSubtitle", {
                defaultValue: `Esta acción borra permanentemente la instancia '${instance?.name}' y sus webhooks. No se puede deshacer.`,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="confirmName" className="text-sm font-medium">
              {t("danger.confirmTypeName", { defaultValue: `Escribí '${instance?.name}' para confirmar:` })}
            </label>
            <Input id="confirmName" autoFocus value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); setConfirmText(""); }} disabled={deleteMut.isPending}>
              {t("common.cancel", { defaultValue: "Cancelar" })}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== instance?.name || deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
              data-testid="danger-confirm-button">
              {deleteMut.isPending ? t("common.saving", { defaultValue: "Borrando…" }) : t("danger.deleteConfirm", { defaultValue: "Borrar definitivamente" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { DangerZone };
