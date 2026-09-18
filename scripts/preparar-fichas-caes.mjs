import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const PRODUTO = "50-projetos-moveis-caes";
const BUCKET = "conteudo-produtos";
const RAIZ_PROJETO = process.cwd();
const RAIZ_ORIGEM = path.resolve(RAIZ_PROJETO, "../50 Projetos para pets");
const DESTINO = path.resolve(RAIZ_PROJETO, ".conteudo-caes");
const DIR_FICHAS = path.join(
  RAIZ_ORIGEM,
  "ENTREGA-CATALOGO-50-PROJETOS-CAES",
  "fichas-tecnicas"
);
const DIR_REFERENCIAS = path.join(
  RAIZ_ORIGEM,
  "ENTREGA-CATALOGO-50-PROJETOS-CAES",
  "referencias-moveis"
);
const DIR_CONTEXTUAIS = path.join(RAIZ_ORIGEM, "assets", "vitrine", "contextual");
const MAPA = JSON.parse(
  readFileSync(path.join(RAIZ_PROJETO, "lib", "config", "fichas-caes.json"), "utf8")
);

const deveSubir = process.argv.includes("--upload");
const forcar = process.argv.includes("--forcar");

function carregarEnvLocal() {
  const arquivo = path.join(RAIZ_PROJETO, ".env.local");
  if (!existsSync(arquivo)) return;
  for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;
    const separador = limpa.indexOf("=");
    if (separador < 1) continue;
    const chave = limpa.slice(0, separador).trim();
    let valor = limpa.slice(separador + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (!process.env[chave]) process.env[chave] = valor;
  }
}

function arquivosDaPasta(diretorio, extensao) {
  if (!existsSync(diretorio)) throw new Error(`Pasta não encontrada: ${diretorio}`);
  return readdirSync(diretorio).filter((nome) => nome.toLowerCase().endsWith(extensao));
}

function arquivoPorNumero(arquivos, numero, obrigatorio) {
  const encontrados = arquivos.filter((nome) => nome.startsWith(`${numero}-`));
  if (encontrados.length === 1) return encontrados[0];
  if (!obrigatorio && encontrados.length === 0) return null;
  throw new Error(
    `Projeto ${numero}: esperado ${obrigatorio ? "1" : "0 ou 1"} arquivo, encontrado(s) ${encontrados.length}.`
  );
}

function validarMapa() {
  if (MAPA.length !== 50) throw new Error(`O mapa tem ${MAPA.length} itens; esperado: 50.`);
  const numeros = new Set(MAPA.map((item) => item.numero));
  const slugs = new Set(MAPA.map((item) => item.slug));
  if (numeros.size !== MAPA.length || slugs.size !== MAPA.length) {
    throw new Error("Há números ou slugs duplicados no mapa de fichas de cães.");
  }
  const contagem = new Map();
  for (const item of MAPA) {
    contagem.set(item.categoria, (contagem.get(item.categoria) ?? 0) + 1);
  }
  const esperadas = [8, 7, 6, 6, 7, 5, 6, 5];
  const obtidas = [...contagem.values()];
  if (obtidas.join(",") !== esperadas.join(",")) {
    throw new Error(`Categorias incorretas: ${obtidas.join(",")} (esperado ${esperadas.join(",")}).`);
  }
}

async function criarCapaDaReferencia(origem, destino) {
  const metadados = await sharp(origem).metadata();
  if (!metadados.width || !metadados.height) {
    throw new Error(`Não foi possível ler as dimensões de ${origem}`);
  }
  const quadrante = {
    left: 0,
    top: 0,
    width: Math.floor(metadados.width / 2),
    height: Math.floor(metadados.height / 2),
  };
  await sharp(origem)
    .extract(quadrante)
    .trim({ background: "#ffffff", threshold: 12 })
    .resize({ width: 900, height: 1200, fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .webp({ quality: 86 })
    .toFile(destino);
}

async function prepararArquivos() {
  validarMapa();
  const fichasOrigem = arquivosDaPasta(DIR_FICHAS, ".png");
  const referenciasOrigem = arquivosDaPasta(DIR_REFERENCIAS, ".png");
  const contextuaisOrigem = arquivosDaPasta(DIR_CONTEXTUAIS, ".webp");

  if (fichasOrigem.length !== 50 || referenciasOrigem.length !== 50) {
    throw new Error(
      `Inventário incompleto: ${fichasOrigem.length} fichas e ${referenciasOrigem.length} referências.`
    );
  }
  if (contextuaisOrigem.length !== 21) {
    throw new Error(`Esperadas 21 imagens contextuais; encontradas ${contextuaisOrigem.length}.`);
  }

  for (const pasta of ["fichas", "capas", "miniaturas"]) {
    mkdirSync(path.join(DESTINO, pasta), { recursive: true });
  }

  let convertidas = 0;
  let reaproveitadas = 0;
  let contextuais = 0;
  let derivadas = 0;
  const arquivos = [];

  for (const item of MAPA) {
    const chave = `${item.numero}-${item.slug}`;
    const nomeFicha = arquivoPorNumero(fichasOrigem, item.numero, true);
    const nomeReferencia = arquivoPorNumero(referenciasOrigem, item.numero, true);
    const nomeContextual = arquivoPorNumero(contextuaisOrigem, item.numero, false);
    const fichaOrigem = path.join(DIR_FICHAS, nomeFicha);
    const referenciaOrigem = path.join(DIR_REFERENCIAS, nomeReferencia);
    const contextualOrigem = nomeContextual
      ? path.join(DIR_CONTEXTUAIS, nomeContextual)
      : null;
    const fichaDestino = path.join(DESTINO, "fichas", `${chave}.webp`);
    const capaDestino = path.join(DESTINO, "capas", `${chave}.webp`);
    const miniaturaDestino = path.join(DESTINO, "miniaturas", `${chave}.webp`);

    if (!forcar && [fichaDestino, capaDestino, miniaturaDestino].every(existsSync)) {
      reaproveitadas++;
    } else {
      await sharp(fichaOrigem)
        .resize({ width: 1500, withoutEnlargement: true })
        .webp({ quality: 88 })
        .toFile(fichaDestino);

      if (contextualOrigem) {
        await sharp(contextualOrigem)
          .resize({ width: 900, height: 1200, fit: "cover", position: "center" })
          .flatten({ background: "#ffffff" })
          .webp({ quality: 86 })
          .toFile(capaDestino);
      } else {
        await criarCapaDaReferencia(referenciaOrigem, capaDestino);
      }

      await sharp(capaDestino)
        .resize({ width: 450, height: 600, fit: "cover" })
        .webp({ quality: 78 })
        .toFile(miniaturaDestino);
      convertidas++;
    }

    if (contextualOrigem) contextuais++;
    else derivadas++;

    arquivos.push({
      ...item,
      chave,
      origemCapa: contextualOrigem ? "contextual" : "referencia",
      ficha: `${PRODUTO}/fichas/${chave}.webp`,
      capa: `${PRODUTO}/capas/${chave}.webp`,
      miniatura: `${PRODUTO}/miniaturas/${chave}.webp`,
    });
  }

  writeFileSync(
    path.join(DESTINO, "arquivos.json"),
    `${JSON.stringify(arquivos, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `Preparo concluído: ${convertidas} convertidas, ${reaproveitadas} reaproveitadas, ` +
      `${contextuais} capas contextuais e ${derivadas} capas derivadas.`
  );
  return arquivos;
}

async function subirArquivos(arquivos) {
  carregarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Supabase não configurado em .env.local.");

  const supabase = createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: buckets, error: erroBuckets } = await supabase.storage.listBuckets();
  if (erroBuckets) throw erroBuckets;
  if (!buckets.some((bucket) => bucket.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/webp"],
    });
    if (error) throw error;
    console.log(`Bucket privado criado: ${BUCKET}`);
  }

  const existentes = new Set();
  for (const pasta of ["fichas", "capas", "miniaturas"]) {
    const prefixo = `${PRODUTO}/${pasta}`;
    const { data, error } = await supabase.storage.from(BUCKET).list(prefixo, { limit: 100 });
    if (error) throw error;
    for (const item of data) existentes.add(`${prefixo}/${item.name}`);
  }

  let enviados = 0;
  let remotosReaproveitados = 0;
  for (const item of arquivos) {
    for (const tipo of ["ficha", "capa", "miniatura"]) {
      const remoto = item[tipo];
      if (!forcar && existentes.has(remoto)) {
        remotosReaproveitados++;
        continue;
      }
      const local = path.join(
        DESTINO,
        tipo === "ficha" ? "fichas" : tipo === "capa" ? "capas" : "miniaturas",
        `${item.chave}.webp`
      );
      const { error } = await supabase.storage.from(BUCKET).upload(remoto, readFileSync(local), {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: forcar,
      });
      if (error) throw new Error(`Falha no upload de ${remoto}: ${error.message}`);
      enviados++;
    }
  }

  const totalBytes = ["fichas", "capas", "miniaturas"].reduce(
    (total, pasta) =>
      total +
      readdirSync(path.join(DESTINO, pasta)).reduce(
        (soma, nome) => soma + statSync(path.join(DESTINO, pasta, nome)).size,
        0
      ),
    0
  );
  console.log(
    `Upload concluído: ${enviados} enviados, ${remotosReaproveitados} reaproveitados no Storage. ` +
      `Pacote local: ${(totalBytes / 1048576).toFixed(1)} MB.`
  );
}

const arquivos = await prepararArquivos();
if (deveSubir) await subirArquivos(arquivos);
else console.log("Use --upload para enviar o conteúdo ao bucket privado.");
