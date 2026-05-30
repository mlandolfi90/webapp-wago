import { Button } from "@evoapi/design-system/button";
import { Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useSendText } from "@/lib/queries/go/sendMessage";

function SendTest() {
  const { t } = useTranslation();
  const [number, setNumber] = useState("");
  const [text, setText] = useState("");

  // INSTANCE_TOKEN se setea centralizadamente en InstanceProvider.

  const sendMut = useSendText();

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !text.trim()) return;
    try {
      await sendMut.mutateAsync({ number: number.trim(), text });
      toast.success(t("sendTest.sendOk", { defaultValue: "Mensaje enviado." }));
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("sendTest.title", { defaultValue: "Enviar mensaje de prueba" })}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("sendTest.subtitle", { defaultValue: "POST /send/text con esta instancia. Útil para verificar la conexión." })}
        </p>
      </header>

      <form onSubmit={onSend} className="bg-card space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <label htmlFor="sendNumber" className="text-sm font-medium">
            {t("sendTest.number", { defaultValue: "Número destino" })}
          </label>
          <Input
            id="sendNumber"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="5491100000000"
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">
            {t("sendTest.numberHint", { defaultValue: "Formato WhatsApp sin signos: 5491100000000" })}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="sendText" className="text-sm font-medium">
            {t("sendTest.text", { defaultValue: "Texto" })}
          </label>
          <Textarea id="sendText" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Hola desde WebAPP-Wago" />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!number.trim() || !text.trim() || sendMut.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {sendMut.isPending ? t("sendTest.sending", { defaultValue: "Enviando…" }) : t("sendTest.sendAction", { defaultValue: "Enviar" })}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { SendTest };
