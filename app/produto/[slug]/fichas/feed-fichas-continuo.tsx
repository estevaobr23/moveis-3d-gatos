"use client";

// app/produto/[slug]/fichas/feed-fichas-continuo.tsx
//
// Feed contínuo das fichas técnicas completas, com opção de 1 ou 2 colunas
// ("feed duplo") — pedido do usuário em 18/09/2026. Densidade salva em
// localStorage, mesmo padrão já usado no seletor de colunas da galeria.

import { useEffect, useState } from "react";
import type { FichaCao } from "@/lib/data/fichas-caes";

const CHAVE_COLUNAS = "fichas-caes-feed-colunas";

export function FeedFichasContinuo({ fichas }: { fichas: FichaCao[] }) {
  const [colunas, setColunas] = useState<1 | 2>(1);

  useEffect(() => {
    try {
      const salva = Number(localStorage.getItem(CHAVE_COLUNAS));
      if (salva === 1 || salva === 2) setColunas(salva);
    } catch {}
  }, []);

  function escolher(valor: 1 | 2) {
    setColunas(valor);
    try {
      localStorage.setItem(CHAVE_COLUNAS, String(valor));
    } catch {}
  }

  return (
    <>
      <div className="fichasFeedControles">
        <span className="fichasFeedControlesRotulo">Feed</span>
        <div className="prodDensidade" aria-label="Colunas do feed">
          <button
            type="button"
            aria-pressed={colunas === 1}
            onClick={() => escolher(1)}
          >
            Simples
          </button>
          <button
            type="button"
            aria-pressed={colunas === 2}
            onClick={() => escolher(2)}
          >
            Duplo
          </button>
        </div>
      </div>

      <div className={`fichasFeedContinuo fichasFeedContinuo--col${colunas}`}>
        {fichas.map((ficha, indice) => (
          <section
            key={ficha.chave}
            className="fichasFeedItem"
            aria-labelledby={`ficha-${ficha.chave}`}
          >
            <div className="fichasFeedItemTopo">
              <span className="fichaSobretitulo">
                PROJETO {ficha.numero} · {ficha.categoria.toUpperCase()}
              </span>
              <h2 id={`ficha-${ficha.chave}`} className="fichasFeedItemTitulo">
                {ficha.nome}
              </h2>
              <span className="prodAbaConta">
                {indice + 1} de {fichas.length}
              </span>
            </div>
            <div className="fichaVisor">
              <img
                src={`/api/conteudo-caes/ficha/${ficha.chave}`}
                alt={`Ficha visual do projeto ${ficha.nome}`}
                width="1500"
                height="2121"
                loading={indice < 2 ? "eager" : "lazy"}
              />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
