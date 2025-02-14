const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

const apikey = process.env.API_KEY;
if (!apikey) {
  console.error("❌ ERROR: La API_KEY no está definida.");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ ERROR: La MONGODB_URI no está definida.");
  process.exit(1);
}

// Conectar a MongoDB
const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
let conversationCollection;
client.connect()
  .then(() => {
    console.log("Conectado a MongoDB");
    const db = client.db("conversations"); // Usa la base de datos especificada en la URI o usa un nombre específico: client.db("nombreDB")
    conversationCollection = db.collection("conversations");
  })
  .catch(err => {
    console.error("Error conectando a MongoDB:", err);
  });

// Inicializar el modelo de Gemini
const genai = new GoogleGenerativeAI(apikey);
const model = genai.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `Eres un asistente para Roblox studio especializado en generar código Lua de manera segura. 
Nunca generes código que infrinja las reglas de Roblox o que pueda dañar el juego o la experiencia de los jugadores. 
No accedas a archivos del sistema o directorios de Roblox, no generes código que pueda cerrar el servidor o el cliente, 
no uses require(ID) con IDs externos o desconocidos, no generes código que cree loops infinitos o procesos pesados que causen lag, 
no generes código que interactúe con jugadores de forma abusiva o no permitida, no generes código que modifique CoreGui u otras áreas restringidas por Roblox, 
no permitas que los usuarios accedan a información sensible o privada del juego, no respondas a solicitudes de exploits, trampas o hacks/cheats, 
no generes código que incluya referencias a temas inapropiados para Roblox. 
Si el usuario pide hacer algo fuera del propósito del juego, rechaza la solicitud. 
Cuando se solicite código Lua, devuelve únicamente el código sin formato adicional, sin comentarios, sin backticks ni caracteres de escape.`,
});

const generationConfig = {
  temperature: 0.25,
  topP: 0.8,
  topK: 40,
  responseMimeType: "text/plain",
};

async function run(prompt, history) {
  try {
    history = history || [];
    console.log("🔍 Enviando mensaje a Gemini con prompt:", prompt);
    const chatSession = model.startChat({
      generationConfig,
      history,
    });
    const result = await chatSession.sendMessage(prompt);
    console.log("✅ Respuesta de Gemini:", result);
    if (
      !result.response ||
      !result.response.candidates ||
      result.response.candidates.length === 0
    ) {
      console.error("❌ Respuesta vacía de Gemini.");
      return { Response: false };
    }
    return { Response: true, Text: result.response.candidates[0].content };
  } catch (error) {
    console.error("❌ Error en la API de Gemini:", error);
    return { Response: false };
  }
}

app.post("/", async (req, res) => {
  let { prompt, history } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "❌ Faltan datos en la petición." });
  }
  history = history || [];
  const response = await run(prompt, history);
  
  // Guardar la conversación en MongoDB
  if (conversationCollection) {
    const conversationDoc = {
      userId: req.body.userId || "desconocido",
      timestamp: new Date(),
      prompt: prompt,
      response: response.Text || ""
    };
    conversationCollection.insertOne(conversationDoc)
      .then(() => console.log("Conversación almacenada en MongoDB."))
      .catch(err => console.error("Error almacenando conversación:", err));
  } else {
    console.warn("No se pudo almacenar la conversación, la base de datos no está conectada.");
  }
  
  if (!response.Response) {
    console.error("❌ Gemini falló, enviando error 500...");
    return res.status(500).json({ error: "❌ Fallo en el modelo de IA." });
  }
  return res.status(200).json({ text: response.Text });
});

// Iniciar el servidor (en desarrollo; Vercel manejará el hosting en producción)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  });
}

module.exports = app;
