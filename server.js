const express = require("express");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 8080;

app.use(bodyParser.json());

const apikey = process.env.API_KEY;
if (!apikey) {
  console.error("❌ ERROR: La API_KEY no está definida.");
  process.exit(1);
}

// Inicializar el modelo una sola vez para mejorar la velocidad
const genai = new GoogleGenerativeAI(apikey);
const model = genai.getGenerativeModel({
  model: "Gemini Flash 2.0",
  systemInstruction: "Responde en menos de 150 caracteres, eres un asistente para Roblox Studio especializado en generar código Lua para modificar el entorno del juego. Si el usuario pide crear, hacer, generar, construir o cualquier acción similar, genera exclusivamente código Lua sin explicaciones adicionales. Si el usuario no está pidiendo generar algo en el juego, responde normalmente.",
});

const generationConfig = {
  temperature: 0,
  topP: 0.8,
  topK: 40,
  responseMimeType: "text/plain",
};

// Función de respuesta rápida
async function run(prompt, history) {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history,
    });

    const result = await chatSession.sendMessage(prompt);
    return { Response: true, Text: result.response.candidates[0].content };
  } catch (error) {
    console.error("❌ Error en la API:", error);
    return { Response: false };
  }
}

// Ruta de la API
app.post("/", async (req, res) => {
  const { prompt, history } = req.body;
  if (!prompt || !history) {
    return res.status(400).json({ error: "❌ Faltan datos en la petición." });
  }

  const response = await run(prompt, history);

  return response.Response
    ? res.status(200).json({ text: response.Text })
    : res.status(500).json({ error: "❌ Error en el servidor." });
});

// Servidor en Vercel
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`)
);
