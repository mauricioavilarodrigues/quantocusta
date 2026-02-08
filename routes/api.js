import { Router } from "express";

const router = Router();

// ===============================
// AVALIAÇÕES (memória)
// ===============================
const counters = new Map(); // id -> { confere, contesta }

function getOrCreate(id) {
  const key = String(id);
  if (!counters.has(key)) counters.set(key, { confere: 0, contesta: 0 });
  return counters.get(key);
}

// GET /api/avaliacoes?ids=1,2,3
router.get("/avaliacoes", (req, res) => {
  const idsRaw = String(req.query.ids || "").trim();
  if (!idsRaw) {
    return res.status(400).json({ erro: "Parâmetro 'ids' obrigatório. Ex: /api/avaliacoes?ids=1,2,3" });
  }

  const ids = idsRaw.split(",").map(s => s.trim()).filter(Boolean);

  // ✅ formato que seu frontend está usando: { "1": {confere, contesta}, "2": ... }
  const porId = Object.fromEntries(ids.map(id => [String(id), getOrCreate(id)]));
  return res.json(porId);
});

// POST /api/avaliacao
// Body: { id, acao: "confere" | "contesta" }
router.post("/avaliacao", (req, res) => {
  const b = req.body || {};
  const id = b.id ?? b.itemId ?? b.produtoId;
  const acao = b.acao ?? b.tipo ?? b.avaliacao;

  if (id === undefined || id === null) {
    return res.status(400).json({ erro: "Body inválido: faltou 'id' (ou itemId/produtoId)." });
  }
  if (!acao || typeof acao !== "string") {
    return res.status(400).json({ erro: "Body inválido: faltou 'acao' (ex: confere/contesta)." });
  }

  const c = getOrCreate(id);
  const t = acao.toLowerCase();

  if (t === "confere" || t === "up" || t === "confirmar" || t === "positivo") c.confere += 1;
  else if (t === "contesta" || t === "contestacao" || t === "down" || t === "negar" || t === "negativo") c.contesta += 1;
  else return res.status(400).json({ erro: `Ação inválida: ${acao}` });

  // ✅ retorno que seu frontend espera: { confere: N, contesta: M }
  return res.json({ ok: true, id: String(id), ...c });
});

// ===============================
// NFC-e (MVP) — cria a rota que está dando 404
// ===============================

// POST /api/nfce/parse
// Body: { url: "https://..." }
router.post("/nfce/parse", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url ausente" });
    }

    // MVP: por enquanto só devolve a URL para provar que a rota existe
    return res.json({
      sourceUrl: url,
      emitente: null,
      cnpj: null,
      dataEmissao: null,
      total: null,
      itens: [],
      warnings: ["Rota /api/nfce/parse OK. Próximo passo: implementar parser para RS."]
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "erro interno" });
  }
});

export default router;
