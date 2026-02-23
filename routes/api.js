import { Router } from "express";
import fs from "fs";
import * as cheerio from "cheerio";

const router = Router();

// ======================================================
// AVALIAÇÕES (seu código original, mantido)
// ======================================================

// Armazenamento simples em memória (para testar).
// (No Render isso zera quando reinicia; depois a gente troca por DB/arquivo)
const counters = new Map(); // id -> {up, down, contestacoes}

function getOrCreate(id) {
  const key = String(id);
  if (!counters.has(key)) counters.set(key, { up: 0, down: 0, contestacoes: 0 });
  return counters.get(key);
}

// GET /api/avaliacoes?ids=1,2,3
router.get("/avaliacoes", (req, res) => {
  const idsRaw = String(req.query.ids || "").trim();
  if (!idsRaw) {
    return res
      .status(400)
      .json({ erro: "Parâmetro 'ids' obrigatório. Ex: /api/avaliacoes?ids=1,2,3" });
  }

  const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const porId = Object.fromEntries(ids.map((id) => [String(id), getOrCreate(id)]));

  return res.json({ porId });
});

// POST /api/avaliacao
// Aceita vários formatos pra bater com teu frontend:
// { id, tipo: "up"|"down"|"contestacao" }
// { id, avaliacao: "up"|"down" }
// { itemId, tipo: ... }
router.post("/avaliacao", (req, res) => {
  const b = req.body || {};
  const id = b.id ?? b.itemId ?? b.produtoId;
  const tipo = b.tipo ?? b.avaliacao ?? b.acao;

  if (id === undefined || id === null) {
    return res.status(400).json({ erro: "Body inválido: faltou 'id' (ou itemId/produtoId)." });
  }
  if (!tipo || typeof tipo !== "string") {
    return res.status(400).json({ erro: "Body inválido: faltou 'tipo' (ex: up/down/contestacao)." });
  }

  const c = getOrCreate(id);
  const t = tipo.toLowerCase();

  if (t === "up" || t === "confirmar" || t === "positivo") c.up += 1;
  else if (t === "down" || t === "negar" || t === "negativo") c.down += 1;
  else if (t === "contestacao" || t === "contestar") c.contestacoes += 1;
  else return res.status(400).json({ erro: `Tipo inválido: ${tipo}` });

  return res.json({ ok: true, id: String(id), contadores: c });
});

// ======================================================
// NFC-e RS (parser) - à prova de duplicação acidental
// ======================================================

// 1) Guarda helpers num namespace global único (evita "Identifier already declared")
globalThis.__qc_nfce ??= {};
const nf = globalThis.__qc_nfce;

// helpers com ||= (se colar duas vezes, não redeclara)
nf.onlyDigits ||= (s) => String(s || "").replace(/\D+/g, "");

nf.isValidCNPJ ||= (cnpjRaw) => {
  const cnpj = nf.onlyDigits(cnpjRaw);
  if (!cnpj || cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calc = (base, weights) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += Number(base[i]) * weights[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base12 = cnpj.slice(0, 12);
  const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const base13 = base12 + String(d1);
  const d2 = calc(base13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return cnpj === base12 + String(d1) + String(d2);
};

nf.extractCNPJFromText ||= (text) => {
  const t = String(text || "");

  const m1 = t.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}\b/);
  if (m1 && nf.isValidCNPJ(m1[0])) return nf.onlyDigits(m1[0]);

  const m2 = t.match(/\b\d{14}\b/);
  if (m2 && nf.isValidCNPJ(m2[0])) return m2[0];

  const all = t.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}\-?\d{2}/g) || [];
  for (const cand of all) {
    if (nf.isValidCNPJ(cand)) return nf.onlyDigits(cand);
  }

  return null;
};

nf.parseMoneyBR ||= (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;

  const cleaned = s.replace(/[Rr]\$\s*/g, "").replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decPos = Math.max(lastComma, lastDot);

  let intPart = cleaned;
  let decPart = "";

  if (decPos >= 0) {
    intPart = cleaned.slice(0, decPos);
    decPart = cleaned.slice(decPos + 1);
  }

  intPart = intPart.replace(/[.,]/g, "");
  decPart = decPart.replace(/[.,]/g, "");

  const numStr = decPos >= 0 ? `${intPart}.${decPart}` : intPart;
  const n = Number(numStr);

  return Number.isFinite(n) ? n : null;
};

nf.debugHtmlSnapshot ||= (html, tag = "nfce_rs") => {
  try {
    const file = `debug_${tag}_${Date.now()}.html`;
    fs.writeFileSync(file, html || "", "utf-8");

    const len = (html || "").length;
    const hasTableWords =
      /produto|qtd|quant|vl|valor|item/i.test(html || "") || /tbody|table/i.test(html || "");

    return { file, len, hasTableWords };
  } catch {
    return { file: null, len: (html || "").length, hasTableWords: false };
  }
};

nf.parseNfceRS ||= (html, sourceUrl) => {
  const $ = cheerio.load(html || "");
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  const warnings = [];
  const dbg = nf.debugHtmlSnapshot(html, "nfce_rs");

  const cnpj = nf.extractCNPJFromText(bodyText);

  const mData =
    bodyText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/) || bodyText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const dataEmissao = mData ? mData[1] : null;

  const mTotal =
    bodyText.match(/\bValor\s+Total[:\s]*([0-9]+[.,][0-9]{2})\b/i) ||
    bodyText.match(/\bTotal[:\s]*([0-9]+[.,][0-9]{2})\b/i) ||
    bodyText.match(/total\s*(r\$)?\s*([\d\.\,]{1,20})/i);
  const total = mTotal ? nf.parseMoneyBR(mTotal[mTotal.length - 1]) : null;

  // Emitente (conservador)
  const limparEmitente = (s) => {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    if (!t) return null;

    const low = t.toLowerCase();
    const ruins = [
      "documento auxiliar",
      "nota fiscal",
      "consumidor eletr",
      "danfe",
      "nfce",
      "sefaz",
      "consulta",
      "qr code",
      "chave de acesso",
      "protocolo",
      "autorizacao",
      "autorização",
    ];
    if (ruins.some((r) => low.includes(r))) return null;
    if (t.length < 4) return null;
    return t.length > 120 ? t.slice(0, 120) : t;
  };

  const extrairEmitentePorTexto = (texto, cnpjLocal) => {
    const t = String(texto || "").replace(/\s+/g, " ").trim();

    let m =
      t.match(/Emitente\s*:\s*([^|]{4,120})/i) ||
      t.match(/Raz[aã]o\s+Social\s*:\s*([^|]{4,120})/i) ||
      t.match(/Nome\s*\/\s*Raz[aã]o\s+Social\s*:\s*([^|]{4,120})/i);

    if (m && m[1]) {
      const ok = limparEmitente(m[1]);
      if (ok) return ok;
    }

    if (cnpjLocal) {
      const idx = t.toLowerCase().indexOf(String(cnpjLocal).toLowerCase());
      if (idx > 0) {
        const antes = t.slice(Math.max(0, idx - 220), idx);
        const mm = antes.match(/([A-ZÀ-Ü0-9][A-ZÀ-Ü0-9 .,&\-\/]{4,120})\s*$/i);
        if (mm && mm[1]) {
          const ok = limparEmitente(mm[1]);
          if (ok) return ok;
        }
      }
    }

    m = t.match(
      /([A-ZÀ-Ü0-9][A-ZÀ-Ü0-9 .,&\-\/]{4,120})\s+CNPJ\s*\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/i
    );
    if (m && m[1]) {
      const ok = limparEmitente(m[1]);
      if (ok) return ok;
    }

    return null;
  };

  let emitente = extrairEmitentePorTexto(bodyText, cnpj);
  emitente = limparEmitente(emitente);
  if (!emitente && cnpj) emitente = `CNPJ ${cnpj}`;

  const itens = [];

  // tabela
  const tables = $("table").toArray();
  for (const tbl of tables) {
    const t = $(tbl).text().replace(/\s+/g, " ").trim();
    if (!/produto/i.test(t)) continue;

    $(tbl)
      .find("tr")
      .each((_, tr) => {
        const cols = $(tr)
          .find("td")
          .toArray()
          .map((td) => $(td).text().replace(/\s+/g, " ").trim())
          .filter(Boolean);

        if (cols.length >= 3) {
          const joined = cols.join(" | ");
          if (/produto|qtd|valor|item/i.test(joined) && cols.length < 6) return;

          itens.push({
            raw: cols,
            produto: cols[0] || null,
            qtd: cols[1] || null,
            valor: cols[2] || null,
          });
        }
      });

    if (itens.length) break;
  }

  // fallback texto
  if (!itens.length) {
    const lines = bodyText
      .replace(/\s{2,}/g, " ")
      .split(/(?=\b\d{1,3}\s)/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (!/^\d{1,3}\s/.test(line)) continue;
      if (!/\b\d+[.,]\d{2}\b/.test(line)) continue;

      const prices = line.match(/\b\d+[.,]\d{2}\b/g) || [];
      const totalItem = prices.length ? prices[prices.length - 1] : null;

      const noIdx = line.replace(/^\d{1,3}\s+/, "");
      const firstPricePos = noIdx.search(/\b\d+[.,]\d{2}\b/);
      const prod = firstPricePos > 0 ? noIdx.slice(0, firstPricePos).trim() : noIdx.trim();

      if (!prod || prod.length < 2) continue;
      if (/total|troco|pagamento|cpf|cnpj|chave|protocolo/i.test(prod)) continue;

      itens.push({ produto: prod, total: totalItem, rawLine: line });
    }
  }

  if (!cnpj) warnings.push("CNPJ não identificado com segurança.");
  if (!total) warnings.push("Total não identificado com segurança.");
  if (!dataEmissao) warnings.push("Data de emissão não identificada com segurança.");
  if (!itens.length) warnings.push("Não consegui extrair itens (HTML pode estar dinâmico ou layout mudou).");

  return {
    ok: true,
    sourceUrl,
    emitente,
    cnpj,
    dataEmissao,
    total,
    itens,
    warnings,
    debug: dbg,
  };
};

// 2) Evita registrar as rotas NFC-e duas vezes (se colar/duplicar arquivo por acidente)
if (!globalThis.__qc_nfce_routes_added) {
  globalThis.__qc_nfce_routes_added = true;

  router.get("/nfce/parse", (req, res) => {
    res.send("OK. Use POST /api/nfce/parse com JSON { url }");
  });

  router.post("/nfce/parse", async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== "string") {
        return res.status(400).json({ erro: "Body inválido: faltou 'url' (string)." });
      }

      // Se seu Node for antigo e der "fetch is not defined", me avisa que eu troco por axios
      const r = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const html = await r.text();

      if (!r.ok) {
        return res.status(502).json({
          sourceUrl: url,
          emitente: null,
          cnpj: null,
          dataEmissao: null,
          total: null,
          itens: [],
          warnings: [`SEFAZ retornou HTTP ${r.status}. Pode ser bloqueio/captcha/layout diferente.`],
          debug: { len: (html || "").length, head: (html || "").slice(0, 500) },
        });
      }

      const parsed = nf.parseNfceRS(html, url);
      return res.json(parsed);
    } catch (e) {
      console.error("NFC-e ERROR:", e);
      return res.status(500).json({
        erro: "Erro interno ao processar NFC-e.",
        detalhe: String(e?.message || e),
      });
    }
  });
}

export default router;
