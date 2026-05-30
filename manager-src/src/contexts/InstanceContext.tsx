/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams } from "react-router-dom";

import { useFetchInstance } from "@/lib/queries/instance/fetchInstance";
import { TOKEN_ID } from "@/lib/queries/token";

import { Instance } from "@/types/evolution.types";

interface InstanceContextProps {
  instance: Instance | null;
  reloadInstance: () => Promise<void>;
}

export const InstanceContext = createContext<InstanceContextProps | null>(null);

export const useInstance = () => {
  const context = useContext(InstanceContext);
  if (!context) {
    throw new Error("useInstance must be used within an InstanceProvider");
  }
  return context;
};

interface InstanceProviderProps {
  children: ReactNode;
}

export const InstanceProvider: React.FC<InstanceProviderProps> = ({ children }): React.ReactNode => {
  const queryParams = useParams<{ instanceId: string }>();
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const { data: instance, refetch: reloadInstance } = useFetchInstance({
    instanceId,
  });

  useEffect(() => {
    if (queryParams.instanceId) {
      setInstanceId(queryParams.instanceId);
    } else {
      setInstanceId(null);
    }
  }, [queryParams]);

  // WAGO-PATCH: seteo CENTRALIZADO en localStorage. Antes cada página
  // (Webhook, Connection, SendTest, DashboardInstance) tenía su propio
  // useEffect duplicado, lo que creaba una race al cambiar de instancia:
  // las queries del primer render usaban el token de la instancia
  // anterior. Ahora vive en un único punto y todas las páginas que
  // viven dentro de InstanceLayout heredan los IDs sincronizados.
  useEffect(() => {
    if (instance) {
      localStorage.setItem(TOKEN_ID.INSTANCE_ID, instance.id);
      localStorage.setItem(TOKEN_ID.INSTANCE_NAME, instance.name);
      localStorage.setItem(TOKEN_ID.INSTANCE_TOKEN, instance.token);
    }
  }, [instance]);

  return (
    <InstanceContext.Provider
      value={{
        instance: instance ?? null,
        reloadInstance: async () => {
          await reloadInstance();
        },
      }}>
      {children}
    </InstanceContext.Provider>
  );
};
