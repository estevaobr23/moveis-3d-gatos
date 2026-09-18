import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const BASE_URL = process.argv.find((item) => item.startsWith("--url="))?.slice(6) ?? "http://localhost:3210";
const PRODUTO_SLUG = "50-projetos-moveis-caes";
const CAKTO_ID = "8a2469fd-e827-4364-bffd-79e453db9109";
const BUCKET = "conteudo-produtos";
const CHAVE_TESTE = "01-casinha-classica";
const RAIZ = process.cwd();
const MAPA = JSON.parse(readFileSync(path.join(RAIZ, "lib", "config", "fichas-caes.json"), "utf8"));
const verificacoes = [];

function carregarEnvLocal() {
  const arquivo = path.join(RAIZ, ".env.local");
  if (!existsSync(arquivo)) return;
  for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;
    const posicao = limpa.indexOf("=");
    if (posicao < 1) continue;
    const chave = limpa.slice(0, posicao).trim();
    let valor = limpa.slice(posicao + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    if (!process.env[chave]) process.env[chave] = valor;
  }
}

function reg(nome, ok, detalhe = "") {
  verificacoes.push(ok);
  console.log(`${ok ? "OK   " : "FALHA"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

async function criarCliente(supabase, produtoId, comAcesso) {
  const marcador = randomUUID();
  const email = `teste-caes-${marcador}@exemplo.invalid`;
  const { data: cliente, error: erroCliente } = await supabase
    .from("customers")
    .insert({ email, name: "Teste automatizado cães" })
    .select("id")
    .single();
  if (erroCliente) throw erroCliente;

  if (comAcesso) {
    const { error } = await supabase.from("entitlements").insert({
      customer_id: cliente.id,
      product_id: produtoId,
      status: "active",
    });
    if (error) throw error;
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHmac("sha256", process.env.SESSION_SECRET)
    .update(token)
    .digest("hex");
  const { error: erroSessao } = await supabase.from("sessions").insert({
    customer_id: cliente.id,
    token_hash: tokenHash,
    user_agent: "teste-conteudo-caes",
    ip: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  });
  if (erroSessao) throw erroSessao;
  return { id: cliente.id, token };
}

async function medirNoNavegador(token) {
  const pasta = path.join(RAIZ, ".verificacao");
  mkdirSync(pasta, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { nome: "mobile-390x844", width: 390, height: 844 },
    { nome: "mobile-360x640", width: 360, height: 640 },
    { nome: "desktop-1440x900", width: 1440, height: 900 },
    { nome: "notebook-1280x720", width: 1280, height: 720 },
  ];

  try {
    for (const viewport of viewports) {
      const contexto = await browser.newContext({ viewport });
      await contexto.addCookies([
        {
          name: "session_token",
          value: token,
          url: BASE_URL,
          httpOnly: true,
          // Sessão injetada só para o navegador local de teste. Em HTTP,
          // Chromium não envia cookie Secure; produção continua usando os
          // atributos definidos em lib/auth/session.ts.
          secure: false,
          sameSite: "Lax",
        },
      ]);
      const pagina = await contexto.newPage();
      await pagina.goto(`${BASE_URL}/produto/${PRODUTO_SLUG}`, { waitUntil: "networkidle" });
      const lista = await pagina.evaluate(() => ({
        largura: document.documentElement.scrollWidth,
        cliente: document.documentElement.clientWidth,
        cards: document.querySelectorAll(".prodFichasCaes .prodFichaCard").length,
        primeiraImagem: Boolean(document.querySelector(".prodFichasCaes img")?.naturalWidth),
      }));
      reg(`${viewport.nome}: biblioteca sem rolagem horizontal`, lista.largura <= lista.cliente + 1, `${lista.largura}/${lista.cliente}px`);
      reg(`${viewport.nome}: biblioteca mostra o mapa completo`, lista.cards === MAPA.length, `${lista.cards}/${MAPA.length}`);
      reg(`${viewport.nome}: primeira capa carregou`, lista.primeiraImagem);
      await pagina.screenshot({ path: path.join(pasta, `${viewport.nome}-biblioteca.png`), fullPage: false });

      if (viewport.nome === "desktop-1440x900") {
        await pagina.locator(".prodBusca input").fill("agility");
        await pagina.waitForFunction(() => document.querySelectorAll(".prodFichasCaes .prodFichaCard").length === 1);
        reg("busca filtra os projetos", await pagina.locator(".prodFichasCaes .prodFichaCard").count() === 1);
        await pagina.locator(".prodBusca input").fill("");
        await pagina.locator(".prodFerramentasBusca select").selectOption({ label: "Acessibilidade" });
        await pagina.waitForFunction(() => document.querySelectorAll(".prodFichasCaes .prodFichaCard").length === 6);
        reg("categoria filtra os seis projetos de acessibilidade", await pagina.locator(".prodFichasCaes .prodFichaCard").count() === 6);
      }

      await pagina.goto(`${BASE_URL}/produto/${PRODUTO_SLUG}/projeto/${CHAVE_TESTE}`, { waitUntil: "networkidle" });
      const leitor = await pagina.evaluate(() => {
        const imagem = document.querySelector(".fichaVisor img");
        const caixa = imagem?.getBoundingClientRect();
        return {
          largura: document.documentElement.scrollWidth,
          cliente: document.documentElement.clientWidth,
          imagemCarregou: Boolean(imagem?.naturalWidth),
          alturaImagem: caixa?.height ?? 0,
          alturaJanela: window.innerHeight,
        };
      });
      reg(`${viewport.nome}: leitor sem rolagem horizontal`, leitor.largura <= leitor.cliente + 1, `${leitor.largura}/${leitor.cliente}px`);
      reg(`${viewport.nome}: ficha protegida carregou`, leitor.imagemCarregou);
      if (viewport.width >= 760) {
        reg(`${viewport.nome}: folha cabe na altura da janela`, leitor.alturaImagem <= leitor.alturaJanela, `${Math.round(leitor.alturaImagem)}/${leitor.alturaJanela}px`);
      }
      await pagina.screenshot({ path: path.join(pasta, `${viewport.nome}-leitor.png`), fullPage: false });
      await contexto.close();
    }
  } finally {
    await browser.close();
  }
}

carregarEnvLocal();
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SESSION_SECRET) {
  throw new Error("Variáveis de Supabase/sessão ausentes.");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const clientes = [];

try {
  const { data: produto, error: erroProduto } = await supabase
    .from("products")
    .select("id, slug, cakto_product_id")
    .eq("slug", PRODUTO_SLUG)
    .single();
  if (erroProduto) throw erroProduto;
  reg("produto existe no banco", Boolean(produto));
  reg("slug do produto confere", produto.slug === PRODUTO_SLUG, produto.slug);
  reg("ID Cakto do produto confere", produto.cakto_product_id === CAKTO_ID, produto.cakto_product_id);

  for (const pasta of ["fichas", "capas", "miniaturas"]) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(`${PRODUTO_SLUG}/${pasta}`, { limit: 100 });
    if (error) throw error;
    reg(`Storage contém 50 ${pasta}`, data.length === MAPA.length, `${data.length}/${MAPA.length}`);
    const esperados = MAPA.map((item) => `${item.numero}-${item.slug}.webp`).sort();
    const recebidos = data.map((item) => item.name).sort();
    reg(
      `Storage contém exatamente o mapa de ${pasta}`,
      recebidos.join(",") === esperados.join(","),
      `${recebidos.length} nomes conferidos`
    );
  }

  const autorizado = await criarCliente(supabase, produto.id, true);
  const semAcesso = await criarCliente(supabase, produto.id, false);
  clientes.push(autorizado.id, semAcesso.id);

  const cabecalhoAutorizado = { Cookie: `session_token=${autorizado.token}` };
  const cabecalhoSemAcesso = { Cookie: `session_token=${semAcesso.token}` };
  const paginaAutorizada = await fetch(`${BASE_URL}/produto/${PRODUTO_SLUG}`, { headers: cabecalhoAutorizado, redirect: "manual" });
  reg("cliente autorizado abre a biblioteca", paginaAutorizada.status === 200, `HTTP ${paginaAutorizada.status}`);

  const paginaBloqueada = await fetch(`${BASE_URL}/produto/${PRODUTO_SLUG}`, { headers: cabecalhoSemAcesso, redirect: "manual" });
  reg("cliente sem produto recebe 404", paginaBloqueada.status === 404, `HTTP ${paginaBloqueada.status}`);

  const imagem = await fetch(`${BASE_URL}/api/conteudo-caes/ficha/${CHAVE_TESTE}`, { headers: cabecalhoAutorizado, redirect: "manual" });
  reg("ficha autorizada redireciona para URL assinada", imagem.status === 302 && Boolean(imagem.headers.get("location")), `HTTP ${imagem.status}`);
  reg("redirect protegido não entra em cache", imagem.headers.get("cache-control")?.includes("no-store") === true, imagem.headers.get("cache-control") ?? "sem header");

  const assinada = imagem.headers.get("location");
  if (assinada) {
    const arquivo = await fetch(assinada);
    reg("URL assinada entrega WebP", arquivo.ok && arquivo.headers.get("content-type")?.includes("image/webp") === true, `HTTP ${arquivo.status}`);
  }

  const bloqueada = await fetch(`${BASE_URL}/api/conteudo-caes/ficha/${CHAVE_TESTE}`, { headers: cabecalhoSemAcesso, redirect: "manual" });
  reg("imagem sem entitlement recebe 404", bloqueada.status === 404, `HTTP ${bloqueada.status}`);
  const inexistente = await fetch(`${BASE_URL}/api/conteudo-caes/ficha/99-nao-existe`, { headers: cabecalhoAutorizado, redirect: "manual" });
  reg("chave fora do mapa recebe 404", inexistente.status === 404, `HTTP ${inexistente.status}`);

  await medirNoNavegador(autorizado.token);
} finally {
  for (const clienteId of clientes) {
    await supabase.from("sessions").delete().eq("customer_id", clienteId);
    await supabase.from("entitlements").delete().eq("customer_id", clienteId);
    await supabase.from("customers").delete().eq("id", clienteId);
  }
}

const { count: testesRestantes } = await supabase
  .from("customers")
  .select("id", { count: "exact", head: true })
  .like("email", "teste-caes-%@exemplo.invalid");
reg("clientes sintéticos foram removidos", testesRestantes === 0, `${testesRestantes ?? "?"} restante(s)`);

const falhas = verificacoes.filter((ok) => !ok).length;
console.log(falhas === 0 ? `\n>>> CONTEÚDO DE CÃES OK (${verificacoes.length} verificações)` : `\n>>> ${falhas} FALHA(S)`);
process.exitCode = falhas === 0 ? 0 : 1;
