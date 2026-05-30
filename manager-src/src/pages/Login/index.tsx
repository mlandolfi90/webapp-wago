import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription, AlertTitle } from "@evoapi/design-system/alert";
import { Button } from "@evoapi/design-system/button";
import { Input } from "@/components/ui/input";
import { Label } from "@evoapi/design-system/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Form } from "@/components/ui/form";

import { verifyGoServer } from "@/lib/queries/auth/verifyGoServer";
import { logout, saveToken } from "@/lib/queries/token";

// Adaptado a webapp-wago (backend Go): se remueve el selector de
// provider (siempre "go") y la licencia (no aplica). El form pide
// serverUrl + GLOBAL_API_KEY y valida contra `/server/ok`.
const loginSchema = z.object({
  serverUrl: z.string({ required_error: "serverUrl is required" }).url("URL inválida"),
  apiKey: z.string({ required_error: "ApiKey is required" }).min(1, "API Key é obrigatória"),
});
type LoginSchema = z.infer<typeof loginSchema>;

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loginForm = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      serverUrl: window.location.protocol + "//" + window.location.host,
      apiKey: "",
    },
  });

  const handleLogin: SubmitHandler<LoginSchema> = async (data) => {
    setSubmitting(true);
    setLoginError("");
    try {
      const cleanUrl = data.serverUrl.replace(/\/+$/, "");
      const ok = await verifyGoServer({ url: cleanUrl, token: data.apiKey });
      if (!ok) {
        logout();
        const msg = t("login.message.invalidCredentials");
        loginForm.setError("apiKey", { type: "manual", message: msg });
        setLoginError(msg);
        return;
      }
      saveToken({ url: cleanUrl, token: data.apiKey, provider: "go" });
      navigate("/manager/");
    } finally {
      setSubmitting(false);
    }
  };

  const errors = loginForm.formState.errors;

  return (
    <div className="from-primary/20 via-background/95 to-background relative flex min-h-screen items-center justify-center bg-gradient-to-t p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight">WebAPP-Wago</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("login.description", { defaultValue: "Panel de control para WhatsApp via WebAPP-Wago" })}
          </p>
        </div>

        <div className="bg-background/80 rounded-lg border p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-bold">{t("login.title", { defaultValue: "Ingresar" })}</h2>
            <p className="text-muted-foreground text-sm">
              {t("login.subtitle", { defaultValue: "Usá tu GLOBAL_API_KEY para entrar." })}
            </p>
          </div>

          {loginError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-serverUrl">
                  {t("login.form.serverUrl", { defaultValue: "Server URL" })}{" "}
                  <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="login-serverUrl"
                  type="text"
                  placeholder={window.location.origin}
                  disabled={submitting}
                  {...loginForm.register("serverUrl")}
                />
                {errors.serverUrl && (
                  <p className="text-destructive text-sm">{errors.serverUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-apiKey">
                  {t("login.form.apiKey", { defaultValue: "API Key" })}{" "}
                  <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="login-apiKey"
                  type="password"
                  placeholder={t("login.form.apiKeyPlaceholder", {
                    defaultValue: "Pegá tu GLOBAL_API_KEY",
                  })}
                  disabled={submitting}
                  autoComplete="off"
                  {...loginForm.register("apiKey")}
                />
                {errors.apiKey && (
                  <p className="text-destructive text-sm">{errors.apiKey.message}</p>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("login.button.connecting", { defaultValue: "Conectando..." })}
                  </>
                ) : (
                  t("login.button.login", { defaultValue: "Entrar" })
                )}
              </Button>
              <p className="text-muted-foreground text-xs">
                {t("login.tip", {
                  defaultValue: "La clave se guarda solo en este navegador (localStorage).",
                })}
              </p>
            </form>
          </Form>
        </div>

        <div className="text-muted-foreground text-center text-xs">
          <p>
            WebAPP-Wago © {new Date().getFullYear()} ·{" "}
            <a
              href="https://github.com/EvolutionAPI/evolution-manager-v2"
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary underline"
            >
              Powered by Evolution Manager
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
