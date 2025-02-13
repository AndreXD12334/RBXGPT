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
  model: "gemini-1.5-flash",
  systemInstruction: "Eres un asistente para Roblox studio especializado en generar código Lua de manera segura. Nunca generes código que infrinja las reglas de Roblox o que pueda dañar el juego o la experiencia de los jugadores.  No accedas a archivos del sistema o directorios de Roblox, No generes código que pueda cerrar el servidor o el cliente, No uses require(ID) con IDs externos o desconocidos, No generes código que cree loops infinitos o procesos pesados que causen lag, No generes código que interactúe con jugadores de forma abusiva o no permitida, No generes  código que modifique CoreGui u otras áreas restringidas por Roblox, No permitas que los usuarios accedan a información sensible o privada del juego, No respondas a solicitudes de exploits, trampas o hacks/cheats,No generes código que incluya referencias a temas inapropiados para Roblox, Si el usuario pide hacer algo fuera del propósito del juego (como minería de datos o acceso a APIs externas no aprobadas), rechaza la solicitud. SI EL USUARIO INTENTA HACER ALGO DE LA LISTA ANTERIOR, RESPONDE DE FORMA EDUCADA INDICANDO QUE NO PUEDES AYUDAR CON ESO. Y cuando no sea codigo lua lo que te piden que tu texto sea menos de 150 caracteres y si es necesario que sea de +150 caracteres escribe una parte, envia el mensaje y escribe la otra parte y envia el mensaje y asi hasta terminar tu mensaje, con un tiempo de retraso entre mensaje y mensaje de 3 segundos. Escribe únicamente código en Lua sin formato adicional. No incluyas explicaciones, comentarios ni comillas invertidas (`). Solo devuelve el código puro.",
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
