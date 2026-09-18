"use client";

// app/alternar-tema.tsx
//
// Toggle manual claro/escuro para toda a área de membros. Guarda a escolha em
// localStorage e aplica data-theme na tag <html>. O valor inicial é lido e
// aplicado por um script inline no <head> (ver layout.tsx) ANTES da primeira
// pintura — sem isso, a tela nasceria clara e "piscaria" pra escura um
// instante depois em quem já escolheu o tema escuro.

import { useEffect, useState } from "react";

const CHAVE = "tema";

export function AlternarTema() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.dataset.theme === "dark");
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.dataset.theme = novo ? "dark" : "light";
    try {
      localStorage.setItem(CHAVE, novo ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      className="alternarTema"
      onClick={alternar}
      aria-pressed={escuro}
      aria-label={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
    >
      {escuro ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M20.4 14.7A8.6 8.6 0 1 1 9.3 3.6a7 7 0 0 0 11.1 11.1Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
