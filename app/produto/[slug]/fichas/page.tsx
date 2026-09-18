import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/session";
import { temAcessoAoProduto } from "@/lib/data/acesso";
import { FICHAS_CAES, PRODUTO_CAES_SLUG } from "@/lib/data/fichas-caes";
import { FeedFichasContinuo } from "./feed-fichas-continuo";
import "../../../inicio.css";

type Params = { slug: string };

export const metadata: Metadata = {
  title: "Todas as fichas · Móveis para Cães",
};

/**
 * Modo "só fichas": as 50 fichas técnicas completas empilhadas em sequência,
 * sem passar pelos cards demonstrativos da galeria. Pedido do usuário em
 * 18/09/2026 — rolar a página folheia o catálogo inteiro direto.
 */
export default async function PaginaFichasCaes({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  if (slug !== PRODUTO_CAES_SLUG) notFound();

  const cliente = await requireCustomer();
  const temAcesso = await temAcessoAoProduto(cliente.id, PRODUTO_CAES_SLUG);
  if (!temAcesso) notFound();

  return (
    <main className="envolucro fichaPagina fichaPaginaCaes">
      <header className="fichaCabecalho">
        <Link className="prodVoltar" href={`/produto/${PRODUTO_CAES_SLUG}`}>
          ← Voltar aos 50 projetos
        </Link>
        <div className="fichaSobretitulo">CATÁLOGO COMPLETO</div>
        <h1 className="pagTitulo">Todas as fichas técnicas</h1>
        <p className="pagSub">
          As {FICHAS_CAES.length} fichas em sequência, sem passar pelos cards de
          apresentação — role para folhear o catálogo inteiro.
        </p>
      </header>

      <FeedFichasContinuo fichas={FICHAS_CAES} />
    </main>
  );
}
