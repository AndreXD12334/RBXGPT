const { MongoClient } = require("mongodb");

// Obtén la URI desde la variable de entorno
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI no está definida en las variables de entorno.");
}

// Opciones de conexión recomendadas
const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function connectDB() {
  try {
    await client.connect();
    console.log("Conectado a MongoDB");
    // Si deseas seleccionar una base de datos en particular, por ejemplo "conversations":
    const db = client.db("conversations");
    return db;
  } catch (err) {
    console.error("Error conectando a MongoDB:", err);
    throw err;
  }
}

module.exports = connectDB;
