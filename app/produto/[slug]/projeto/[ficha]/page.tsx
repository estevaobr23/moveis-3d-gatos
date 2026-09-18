import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/session";
import { temAcessoAoProduto } from "@/lib/data/acesso";
import {
  acharFichaCao,
  FICHAS_CAES,
  PRODUTO_CAES_SLUG,
} from "@/lib/data/fichas-caes";
import "../../../../inicio.css";

type Params = { slug: string; ficha: string };

export const metadata: Metadata = {
  title: "Projeto visual · Móveis para Cães",
};

export default async function PaginaProjetoCao({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, ficha: chave } = await params;
  if (slug !== PRODUTO_CAES_SLUG) notFound();

  const cliente = await requireCustomer();
  const temAcesso = await temAcessoAoProduto(cliente.id, PRODUTO_CAES_SLUG);
  if (!temAcesso) notFound();

  const indice = FICHAS_CAES.findIndex((item) => item.chave === chave);
  if (indice === -1) notFound();

  const ficha = acharFichaCao(chave);
  if (!ficha) notFound();

  const anterior = FICHAS_CAES[indice - 1];
  const proxima = FICHAS_CAES[indice + 1];
  const urlFicha = `/api/conteudo-caes/ficha/${ficha.chave}`;

  return (
    <main className="envolucro fichaPagina fichaPaginaCaes">
      <header className="fichaCabecalho">
        <Link className="prodVoltar" href={`/produto/${PRODUTO_CAES_SLUG}`}>
          ← Voltar aos 50 projetos
        </Link>
        <div className="fichaSobretitulo">
          PROJETO {ficha.numero} · {ficha.categoria.toUpperCase()}
        </div>
        <h1 className="pagTitulo">{ficha.nome}</h1>
        <p className="pagSub">
          Ficha visual A4 com medidas, peças e sequência de montagem organizadas
          em uma única página.
        </p>
        <div className="fichaChips" aria-label="Informações rápidas">
          <span>
            {indice + 1} de {FICHAS_CAES.length}
          </span>
          <span>{ficha.categoria}</span>
        </div>
      </header>

      <section className="fichaLeitor" aria-labelledby="titulo-ficha-caes">
        <div className="fichaSecaoTitulo">
          <div>
            <span className="fichaRotulo">FICHA DO PROJETO</span>
            <h2 id="titulo-ficha-caes">Veja todos os detalhes</h2>
          </div>
          <a
            className="fichaBotaoSecundario"
            href={urlFicha}
            target="_blank"
            rel="noreferrer"
          >
            Abrir em tamanho maior
          </a>
        </div>
        <div className="fichaVisor">
          <img
            src={urlFicha}
            alt={`Ficha visual do projeto ${ficha.nome}`}
            width="1500"
            height="2121"
          />
        </div>
      </section>

      <aside className="fichaAvisoTecnico">
        <strong>Antes de construir</strong>
        <p>
          Confira as medidas no local de instalação e revise as soluções de
          fixação antes da fabricação, especialmente em produção comercial ou
          em escala.
        </p>
      </aside>

      <nav className="fichaNav" aria-label="Navegar entre projetos">
        {anterior ? (
          <Link
            href={`/produto/${PRODUTO_CAES_SLUG}/projeto/${anterior.chave}`}
            className="fichaNavLink"
          >
            ←
            <span>
              <small>Anterior</small>
              {anterior.nome}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {proxima && (
          <Link
            href={`/produto/${PRODUTO_CAES_SLUG}/projeto/${proxima.chave}`}
            className="fichaNavLink fichaNavLink--prox"
          >
            <span>
              <small>Próximo</small>
              {proxima.nome}
            </span>
            →
          </Link>
        )}
      </nav>
    </main>
  );
}
