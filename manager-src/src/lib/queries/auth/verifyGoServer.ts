import axios from "axios";

interface VerifyGoServerParams {
  url: string;
  token: string;
}

// El backend Go expone `/server/ok` como healthcheck PÚBLICO (no valida
// apikey). Para validar la GLOBAL_API_KEY usamos `/instance/all` que
// está bajo AuthAdmin — devuelve 401/403 con key inválida y 200 con
// key correcta (data: [] si no hay instancias).
export const verifyGoServer = async ({ url, token }: VerifyGoServerParams) => {
  try {
    const response = await axios.get(`${url}/instance/all`, {
      headers: { apikey: token, "Cache-Control": "no-cache" },
      params: { t: Date.now() },
    });
    return response.status === 200;
  } catch {
    return false;
  }
};
