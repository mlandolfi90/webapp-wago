import { useTranslation } from "react-i18next";

import { Button } from "@evoapi/design-system/button";

// Footer adaptado a wago: removidos los `useVerifyServer` que solo
// disparaban con provider "api" (Evolution Node) y dejaban
// `clientName`/`version` siempre vacíos. Removidos los links de
// soporte propios de Evolution; conservado el "Powered by Evolution
// Manager" como crédito Apache 2.0 al proyecto original.
function Footer() {
  const { t } = useTranslation();

  const links = [
    {
      name: "WebAPP-Wago",
      url: "https://github.com/mlandolfi90/webapp-wago",
    },
    {
      name: t("footer.poweredBy", { defaultValue: "Powered by Evolution Manager" }),
      url: "https://github.com/EvolutionAPI/evolution-manager-v2",
    },
  ];

  return (
    <footer className="flex w-full flex-col items-center justify-between p-6 text-xs text-secondary-foreground sm:flex-row">
      <div className="flex items-center space-x-3 divide-x">
        <span>WebAPP-Wago © {new Date().getFullYear()}</span>
      </div>
      <div className="flex gap-2">
        {links.map((link) => (
          <Button variant="link" asChild key={link.url} size="sm" className="text-xs">
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.name}
            </a>
          </Button>
        ))}
      </div>
    </footer>
  );
}

export { Footer };
