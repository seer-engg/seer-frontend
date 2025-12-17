import { Client, type RequestHook } from "@langchain/langgraph-sdk";
import { backendTokenProvider } from "@/lib/api-client";

const injectBearerToken: RequestHook = async (_url, init) => {
  const token = await backendTokenProvider();
  if (!token) {
    return init;
  }
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
};

export function createClient(apiUrl: string, apiKey: string | undefined) {
  return new Client({
    apiKey,
    apiUrl,
    onRequest: injectBearerToken,
  });
}