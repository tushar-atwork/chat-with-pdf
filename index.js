require("dotenv").config();

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");

const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in .env");
}

const upload = multer({ dest: "uploads/" });

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});
async function createEmbedding(text) {
     const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text,
    });
    return response.embeddings[0].value;
}
app.get("/", (req, res) => {
  res.send("Hey i am tushar");
});

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    const chunks = text.split("\n").filter((chunk) => chunk.trim() !== "");

    const embedding = await createEmbedding(chunks[0]);
    console.log(embedding);

    const question = "what is this pdf about in simple words";
    const matchChunk = chunks.find((chunk) => chunk.toLowerCase().includes(question));

    const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: `answer the following question using the context ${matchChunk} and question is${question}`,
    
    });

    res.json({
        matchChunk,     
        text: response.text 
    });
  } catch (error) {
    res.status(500).json({
        status:false,
        message:"something went wrong",
        error
    })
  }
});

app.listen(PORT, () => {
  console.log("server is running on", PORT);
});
