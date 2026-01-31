// init
import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://mauricioavilarodrigues.github.io"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// estado em memória
let contador = 0;

// rota de teste
app.post("/api/clique", (req, res) => {
  contador++;
  res.json({ total: contador });
});

app.get("/api/clique", (req, res) => {
  res.json({ total: contador });
});

// suas rotas existentes
app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Quantocusta API rodando 🚀");
});

// porta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando em http://localhost:" + PORT);
});
