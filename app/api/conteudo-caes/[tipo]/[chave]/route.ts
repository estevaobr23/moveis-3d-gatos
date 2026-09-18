import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { temAcessoAoProduto } from "@/lib/data/acesso";
import {
  acharFichaCao,
  PRODUTO_CAES_SLUG,
} from "@/lib/data/fichas-caes";
import { urlAssinadaConteudo } from "@/lib/data/storage-assinado";

export const dynamic = "force-dynamic";

type Params = { tipo: string; chave: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const cliente = await requireCustomer();
  const temAcesso = await temAcessoAoProduto(cliente.id, PRODUTO_CAES_SLUG);
  if (!temAcesso) return new Response(null, { status: 404 });

  const { tipo, chave } = await params;
  const ficha = acharFichaCao(chave);
  if (!ficha) return new Response(null, { status: 404 });

  const caminho =
    tipo === "ficha"
      ? ficha.fichaStoragePath
      : tipo === "capa"
        ? ficha.capaStoragePath
        : tipo === "miniatura"
          ? ficha.miniaturaStoragePath
          : null;

  if (!caminho) return new Response(null, { status: 404 });

  const url = await urlAssinadaConteudo(caminho);
  if (!url) return new Response(null, { status: 404 });

  const resposta = NextResponse.redirect(url, 302);
  resposta.headers.set("Cache-Control", "private, no-store");
  resposta.headers.set("X-Content-Type-Options", "nosniff");
  return resposta;
}
