import { useMutation } from "@tanstack/react-query";

import { api } from "../../api";

// POST /send/text — token-scoped. Mínimo viable para sender de prueba.

type SendTextInput = {
  number: string;
  text: string;
  delay?: number;
};

export const useSendText = () =>
  useMutation({
    mutationFn: async (input: SendTextInput) => {
      const response = await api.post("/send/text", { delay: 0, ...input });
      return response.data;
    },
  });
