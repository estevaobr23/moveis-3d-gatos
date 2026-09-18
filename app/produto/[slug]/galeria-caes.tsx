"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type FichaCaoPublica = {
  numero: string;
  chave: string;
  nome: string;
  categoria: string;
  href: string;
  capa: string;
  miniatura: string;
};

export function GaleriaCaes({ fichas }: { fichas: FichaCaoPublica[] }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [colunas, setColunas] = useState(3);

  useEffect(() => {
    try {
      const salva = Number(localStorage.getItem("fichas-caes-colunas"));
      if ([1, 2, 3].includes(salva)) setColunas(salva);
    } catch {}
  }, []);

  const categorias = useMemo(
    () => ["Todas", ...new Set(fichas.map((ficha) => ficha.categoria))],
    [fichas]
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return fichas.filter(
      (ficha) =>
        (!termo ||
          `${ficha.numero} ${ficha.nome} ${ficha.categoria}`
            .toLocaleLowerCase("pt-BR")
            .includes(termo)) &&
        (categoria === "Todas" || ficha.categoria === categoria)
    );
  }, [busca, categoria, fichas]);

  return (
    <>
      <div className="prodFerramentasBusca prodFerramentasBusca--caes">
        <label className="prodBusca">
          <span className="srOnly">Buscar projetos</span>
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por nome, número ou categoria…"
          />
        </label>
        <select
          value={categoria}
          onChange={(evento) => setCategoria(evento.target.value)}
          aria-label="Filtrar por categoria"
        >
          {categorias.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <div className="prodDensidade" aria-label="Colunas da galeria">
          {[1, 2, 3].map((numero) => (
            <button
              key={numero}
              type="button"
              aria-pressed={colunas === numero}
              onClick={() => {
                setColunas(numero);
                try {
                  localStorage.setItem("fichas-caes-colunas", String(numero));
                } catch {}
              }}
            >
              {numero}
            </button>
          ))}
        </div>
      </div>

      <div className="prodResultado">
        <strong>{visiveis.length}</strong>{" "}
        {visiveis.length === 1 ? "projeto encontrado" : "projetos encontrados"}
      </div>

      <div className={`prodFichasFeed prodFichasCaes grade${colunas}`}>
        {visiveis.map((ficha) => (
          <Link key={ficha.numero} className="prodFichaCard" href={ficha.href}>
            <div className="prodFichaCapa prodFichaCapa--caes">
              <picture>
                <source media="(min-width: 760px)" srcSet={ficha.miniatura} />
                <img
                  src={ficha.capa}
                  alt=""
                  width="900"
                  height="1200"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <span className="prodFichaNum">PROJETO {ficha.numero}</span>
            </div>
            <span className="prodFichaCategoria">{ficha.categoria}</span>
            <span className="prodFichaNome">{ficha.nome}</span>
          </Link>
        ))}
      </div>

      {visiveis.length === 0 && (
        <p className="prodFichasVazio">
          Nenhum projeto corresponde aos filtros selecionados.
        </p>
      )}
    </>
  );
}
