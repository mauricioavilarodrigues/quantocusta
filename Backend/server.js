import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();

app.use(cors());
app.use(express.json());

const FILE_PATH = "./precos.json";

// função para ler o arquivo
function lerPrecos() {
  const data = fs.readFileSync(FILE_PATH, "utf-8");
  return JSON.parse(data);
}

// função para salvar no arquivo
function salvarPrecos(precos) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(precos, null, 2));
}

// rota para listar preços
app.get("/api/precos", (req, res) => {
  const precos = lerPrecos();
  res.json(precos);
});

// rota para cadastrar preço
app.post("/api/precos", (req, res) => {
  const { produto, preco, mercado, cidade } = req.body;

  if (!produto || !preco || !mercado) {
    return res.status(400).json({ erro: "Dados incompletos" });
  }

  const precos = lerPrecos();

  const novoPreco = {
    produto,
    preco,
    mercado,
    cidade,
    data: new Date().toISOString()
  };

  precos.push(novoPreco);
  salvarPrecos(precos);

  res.json({ mensagem: "Preço salvo com sucesso!", novoPreco });
});

app.get("/", (req, res) => {
  res.send("Backend Quantocusta rodando 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando em http://localhost:" + PORT);
});

