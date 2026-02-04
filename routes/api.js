import { Router } from "express";

const router = Router();

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
    return res.status(400).json({ erro: "Parâmetro 'ids' obrigatório. Ex: /api/avaliacoes?ids=1,2,3" });
  }

  const ids = idsRaw.split(",").map(s => s.trim()).filter(Boolean);
  const porId = Object.fromEntries(ids.map(id => [String(id), getOrCreate(id)]));

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

export default router;
