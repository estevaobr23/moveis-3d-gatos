import "server-only";
import mapa from "@/lib/config/fichas-caes.json";

/**
 * Feed das fichas técnicas do produto "50 Projetos de Móveis para Cães".
 * Ao contrário de gatos (arquivos públicos em public/fichas/), o conteúdo
 * de cães vive num bucket PRIVADO do Supabase Storage (conteudo-produtos) —
 * servido só via URL assinada em app/api/conteudo-caes/[tipo]/[chave], depois
 * de conferir entitlement. Gerado/enviado por scripts/preparar-fichas-caes.mjs.
 */
export const PRODUTO_CAES_SLUG = "50-projetos-moveis-caes";
export const BUCKET_CONTEUDO = "conteudo-produtos";

interface ItemMapa {
  numero: string;
  slug: string;
  nome: string;
  categoria: string;
}

export interface FichaCao {
  numero: string; // "01".."50"
  slug: string;
  chave: string; // "<numero>-<slug>", identifica o projeto na URL
  nome: string;
  categoria: string;
  fichaStoragePath: string; // <produto>/fichas/<chave>.webp
  capaStoragePath: string; // <produto>/capas/<chave>.webp
  miniaturaStoragePath: string; // <produto>/miniaturas/<chave>.webp
}

export const FICHAS_CAES: FichaCao[] = (mapa as ItemMapa[])
  .map((item) => {
    const chave = `${item.numero}-${item.slug}`;
    return {
      numero: item.numero,
      slug: item.slug,
      chave,
      nome: item.nome,
      categoria: item.categoria,
      fichaStoragePath: `${PRODUTO_CAES_SLUG}/fichas/${chave}.webp`,
      capaStoragePath: `${PRODUTO_CAES_SLUG}/capas/${chave}.webp`,
      miniaturaStoragePath: `${PRODUTO_CAES_SLUG}/miniaturas/${chave}.webp`,
    } satisfies FichaCao;
  })
  .sort((a, b) => a.numero.localeCompare(b.numero));

export function acharFichaCao(chave: string): FichaCao | undefined {
  return FICHAS_CAES.find((ficha) => ficha.chave === chave);
}
