import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { BUCKET_CONTEUDO } from "@/lib/data/fichas-caes";

const VALIDADE_SEGUNDOS = 3600;
const REUSO_MS = (VALIDADE_SEGUNDOS - 600) * 1000;
const assinadas = new Map<string, { url: string; expiraEm: number }>();

export async function urlAssinadaConteudo(caminho: string): Promise<string | null> {
  const agora = Date.now();
  const emCache = assinadas.get(caminho);
  if (emCache && emCache.expiraEm > agora) return emCache.url;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_CONTEUDO)
    .createSignedUrl(caminho, VALIDADE_SEGUNDOS);

  if (error || !data?.signedUrl) return null;
  assinadas.set(caminho, { url: data.signedUrl, expiraEm: agora + REUSO_MS });
  return data.signedUrl;
}
