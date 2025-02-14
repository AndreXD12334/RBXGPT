import { MongoClient } from "mongodb";

export default async function handler(req, res) {
    const uri = process.env.MONGODB_URI; // Asegúrate de que esta variable esté definida en Vercel
    if (!uri) {
        return res.status(500).json({ error: "MONGODB_URI no está definida" });
    }

    try {
        const client = await MongoClient.connect(uri);
        const db = client.db("conversations"); // Reemplaza con el nombre real de tu base
        const collections = await db.listCollections().toArray();
        
        client.close();
        res.status(200).json({ message: "Conexión exitosa", collections });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
