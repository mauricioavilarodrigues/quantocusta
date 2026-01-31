// init
import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();

// 1) CORS: libere seu GitHub Pages (recomendado)
// Troque pelo SEU usuário (ou deixe "*" só pra teste rápido)
app.use(
  cors({
    origin: [
      "http://localhost:5500",              // Live Server (opcional)
      "http://127.0.0.1:5500",              // Live Server (opcional)
      "https://mauricioavilarodrigues.github.io" // GitHub Pages (origin)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// 2) “estado” em memória (zera quando reiniciar o servidor)
let clickCount = 0;

// 3) endpoints de teste (guardam interação)
app.get("/api/clicks", (req, res) => {
  res.json({ clicks: clickCount });
});

app.post("/api/click", (req, res) => {
  clickCount += 1;
  res.json({ clicks: clickCount });
});

// Mantém suas rotas existentes
app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Quantocusta API rodando 🚀");
});

// 4) PORT correto (PC e deploy)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando em http://localhost:" + PORT);
});

let contador = 0;

app.post("/api/clique", (req, res) => {
  contador++;
  res.json({ total: contador });
});
