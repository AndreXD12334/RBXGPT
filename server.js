const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors()); // Permitir solicitudes desde cualquier origen (Roblox incluido)
app.use(bodyParser.json());

const apikey = process.env.API_KEY;
if (!apikey) {
  console.error("❌ ERROR: La API_KEY no está definida.");
  process.exit(1);
}

// Inicializar el modelo una sola vez
const genai = new GoogleGenerativeAI(apikey);
const model = genai.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `Eres un asistente para Roblox Studio especializado en generar código Lua de manera segura. 
  Nunca generes código que infrinja las reglas de Roblox o que pueda dañar el juego o la experiencia de los jugadores. 
  No accedas a archivos del sistema o directorios de Roblox, No generes código que pueda cerrar el servidor o el cliente, 
  No uses require(ID) con IDs externos o desconocidos, No generes código que cree loops infinitos o procesos pesados que causen lag, 
  No generes código que interactúe con jugadores de forma abusiva o no permitida, No generes código que modifique CoreGui u otras áreas restringidas por Roblox, 
  No permitas que los usuarios accedan a información sensible o privada del juego, No respondas a solicitudes de exploits, trampas o hacks/cheats, 
  No generes código que incluya referencias a temas inapropiados para Roblox, Si el usuario pide hacer algo fuera del propósito del juego 
  (como minería de datos o acceso a APIs externas no aprobadas), rechaza la solicitud. 
  SI EL USUARIO INTENTA HACER ALGO DE LA LISTA ANTERIOR, RESPONDE DE FORMA EDUCADA INDICANDO QUE NO PUEDES AYUDAR CON ESO. 
  Y cuando no sea código Lua lo que te piden, tu texto debe ser menos de 150 caracteres. 
  Si necesitas escribir más de 150 caracteres, divide el mensaje en partes y envía cada parte con un retraso de 3 segundos entre mensajes. 
  Escribe únicamente código en Lua sin formato adicional. No incluyas explicaciones, comentarios, comillas invertidas (\`) ni caracteres de escape como '\\'. 
  Solo devuelve el código puro y ejecutable en Lua.`,
});

const generationConfig = {
  temperature: 0,
  topP: 0.8,
  topK: 40,
  responseMimeType: "text/plain",
};

// Función para manejar las solicitudes de la IA
async function run(prompt, history) {
  try {
    history = history || []; // Asegurar que history no sea undefined

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

// Ruta para recibir solicitudes desde Roblox o Postman
app.post("/", async (req, res) => {
  let { prompt, history } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "❌ Faltan datos en la petición." });
  }

  history = history || []; // Evita errores si history es undefined

  const response = await run(prompt, history);

  if (!response.Response) {
    console.error("❌ Gemini falló, enviando error 500...");
    return res.status(500).json({ error: "❌ Fallo en el modelo de IA." });
  }

  return res.status(200).json({ text: response.Text });
});

// Exportar el handler para Vercel
module.exports = app;
