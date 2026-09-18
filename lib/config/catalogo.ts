// lib/config/catalogo.ts
//
// Fonte ÚNICA da vitrine da área de membros. A UI (aba "Início" e a página
// /produto/<slug>) só renderiza o que estiver aqui — nada de produto, bônus,
// preço ou contagem inventada na tela.
//
// COMO USAR:
//   - cada `Produto` vira um card na aba "Início" e uma página /produto/<slug>;
//   - `caktoProductId` casa com `products.cakto_product_id` no Supabase. É ele
//     que decide se o cliente vê o produto como "seu" (tem entitlement ativo)
//     ou como oferta. `null` = produto sem checkout ainda;
//   - `itens` são os cards DENTRO da página do produto: exatamente 1 do tipo
//     "principal" e quantos "bonus" existirem. Sem bônus? Deixe só o principal;
//   - `aVenda` só quando o produto deve aparecer para quem NÃO tem acesso.
//     Sem `aVenda` e sem acesso => o card nem aparece (nada de card fantasma).
//
// Ao adicionar um produto novo aqui, confirme que existe a linha correspondente
// em `products` no banco (mesmo `cakto_product_id`) — senão ninguém terá acesso.

export type ItemProduto = {
  /** Identificador do item dentro do produto (chave de lista, âncora). */
  slug: string;
  tipo: "principal" | "bonus";
  titulo: string;
  descricao: string;
  /** Caminho de imagem em /public (ex: "/modelos/039-.../preview.png"). */
  capa: string;
  /** Destino do card. Rota interna já existente (ex: "/projetos"). */
  href: string;
};

export type Produto = {
  /** Rota da página do produto: /produto/<slug>. */
  slug: string;
  /** Casa com products.cakto_product_id no banco. null = sem checkout ainda. */
  caktoProductId: string | null;
  titulo: string;
  subtitulo: string;
  /** Imagem de capa do produto na vitrine, caminho em /public. */
  capa: string;
  /** 1 item "principal" + N "bonus". */
  itens: ItemProduto[];
  /** Presente só se o produto deve ser mostrado como oferta a quem não tem acesso. */
  aVenda?: { precoBRL: number; url: string };
};

export const CATALOGO: Produto[] = [
  {
    slug: "acervo-3d-gatos",
    // Tem que ser IDÊNTICO ao products.cakto_product_id no Supabase
    // (projeto acervo-3d-membros) — é essa string que casa o entitlement do
    // cliente com este produto em app/produto/[slug]/page.tsx. Atualizado em
    // 17/09/2026 para o id real do produto ativo na Cakto ("100 Projetos de
    // Móveis 3D para Gatos"); o webhook cakto-webhook grava esse mesmo id em
    // products.cakto_product_id a cada compra aprovada — ver gpt.md, seção
    // "Área de membros — fluxo de acesso", antes de trocar este valor de novo.
    caktoProductId: "53893d88-1a58-4b12-b632-b17f07b28dcb",
    titulo: "Biblioteca de Fichas Visuais — Móveis para Gatos",
    subtitulo:
      "Fichas visuais A4 com medidas sugeridas, peças e montagem. Projetos selecionados também incluem visualização 3D interativa.",
    // Mockup "header/plano completo" real do produto (o mesmo usado na
    // página de vendas), não uma foto de peça avulsa — pedido do usuário em
    // 18/09/2026: capa do card tem que ser o hero, não um preview de projeto.
    capa: "/vitrine/hero-gatos.webp",
    itens: [
      {
        slug: "acervo",
        tipo: "principal",
        titulo: "Todos os projetos",
        descricao:
          "Móveis e playgrounds em 3D, agrupados por família. Cada projeto abre com visualizador interativo, peças, medidas adaptáveis, montagem e calculadora de custos.",
        // Caminho corrigido em 18/09/2026: a pasta "041-torre-alta-vertical"
        // não existe mais — os projetos foram renumerados e a torre alta
        // vertical real é "003-torre-alta-vertical" (imagem quebrada antes).
        capa: "/modelos/003-torre-alta-vertical/preview.png",
        href: "/projetos",
      },
      // Sem bônus por enquanto. Para adicionar um, copie um item com
      // tipo: "bonus" e aponte o href para a rota do conteúdo dele.
    ],
    // Sem `aVenda`: este é o produto que o cliente de teste já tem liberado;
    // não há checkout público ainda.
  },
  {
    slug: "50-projetos-moveis-caes",
    // Tem que ser IDÊNTICO ao products.cakto_product_id no Supabase
    // (mesmo projeto acervo-3d-membros, linha inserida em 18/09/2026 —
    // ver CONTEXTO-INTEGRACAO-AREA-MEMBROS.md em "50 Projetos para pets").
    caktoProductId: "8a2469fd-e827-4364-bffd-79e453db9109",
    titulo: "50 Projetos de Móveis para Cães",
    subtitulo:
      "Biblioteca visual com 50 projetos de casinhas, camas, comedouros e acessórios para planejar, adaptar e construir.",
    // Mesmo mockup usado no header e no "plano completo" do site de vendas
    // real (dist/index.html referencia hero-header-transparent-*.png) — não
    // o hero-header.png com fundo, que é uma variante não usada no site.
    capa: "/vitrine/hero-caes.png",
    itens: [
      {
        slug: "acervo",
        tipo: "principal",
        titulo: "Todos os projetos",
        descricao:
          "Fichas técnicas com lista de peças, medidas e passo a passo de montagem.",
        capa: "/vitrine/hero-caes.png",
        href: "/produto/50-projetos-moveis-caes",
      },
    ],
    // aVenda: ainda não há entitlement de teste para este produto — o card
    // aparece como oferta até a compra real liberar o acesso. Link é a
    // oferta VIP (padrão) cadastrada na Cakto, id "zov8af3".
    aVenda: { precoBRL: 29.9, url: "https://pay.cakto.com.br/zov8af3" },
  },
];

/** Acha um produto pelo slug da rota. */
export function acharProduto(slug: string): Produto | undefined {
  return CATALOGO.find((p) => p.slug === slug);
}
