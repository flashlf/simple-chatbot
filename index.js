import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer();
const aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AI_MODEL = "gemini-3.6-flash";

app.use(express.json());
const PORT = 3000;
app.listen(PORT, () => console.log(`Server up on http://localhost:${PORT}`));

app.post('/generate-text', async (req, resp) => {
  const {prompt} = req.body;

  try {
    const response = await aiInstance.models.generateContent({
      model: AI_MODEL,
      contents: prompt
    });
    resp.status(200).json({result: response.text});
  } catch (e) {
    console.warn(e);
    resp.status(503).json({ message: e.message})
  }
});

app.post("/generate-from-image", upload.single("image"), async(req, res) => {
  const {prompt} = req.body;
  const base64Image = req.file.buffer.toString("base64");

  try {
    const response = await aiInstance.models.generateContent({
      model: AI_MODEL,
      contents: [
        { text: prompt, type: "text" },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype} }
      ]
    })
    res.status(200).json({ result: response.text })
  } catch (e) {
    console.log(e); res.status(500).json({ message: e.message });
  }
})

app.post("/generate-from-doc", upload.single("document"), async(req, res) => {
  const {prompt} = req.body;
  const base64Doc = req.file.buffer.toString("base64");

  try {
    const response = await aiInstance.models.generateContent({
      model: AI_MODEL,
      contents: [
        { text: prompt ?? "Tolong buat ringkasan dari dokumen berikut.", type: "text" },
        { inlineData: { data: base64Doc, mimeType: req.file.mimetype} }
      ]
    })
    res.status(200).json({ result: response.text })
  } catch (e) {
    console.log(e); res.status(500).json({ message: e.message });
  }
})

app.post("/generate-from-audio", upload.single("audio"), async(req, res) => {
  const { prompt } = req.body;
  const base64Audio = req.file.buffer.toString("base64")

  try {
    const response = await aiInstance.models.generateContent({
      model: AI_MODEL,
      contents: [
        { text: prompt ?? "Tolong buatkan transkrip dari rekaman berikut.", type: "text" },
        { inlineData: { data: base64Audio, mimeType: req.file.mimetype} }
      ],
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.log(e); res.status(500).json({ message: e.message });
  }
});

app.post("/api/query", async (req, res) => {
  const { conversation } = req.body;
  try {
    if (!Array.isArray(conversation)) throw new Error("Message must be and array!");

    const contents = conversation.map(({ role, text}) => ({
      role,
      parts: [{ text }]
    }));

    const response = await aiInstance.models.generateContent({
      model: AI_MODEL,
      contents,
      config: {
        temperature: 0.3, // skala dari 0 s-d 2.0
        systemInstruction: `
Kamu adalah seorang Notulen Eksekutif Kelas Dunia dan Asisten AI Serba Bisa.

PERAN UTAMA (SPESIALISASI NOTULEN):
1. Ketika pengguna memberikan transkrip, catatan mentah, atau argumen rapat:
   - Buat notulen terstruktur yang mencakup: Ringkasan Eksekutif, Keputusan Utama, Action Items (Penanggung Jawab, Tugas, Tenggat Waktu), dan Diskusi/Isu Tertunda.
   - Sajikan dengan bahasa eksekutif yang lugas, tajam, dan objektif.

KEMAMPUAN GENERAL:
2. Jika pengguna mengajukan pertanyaan umum di luar konteks rapat:
   - Jawab dengan responsif, akurat, dan informatif.

GAYA BAHASA:
- Selalu gunakan Bahasa Indonesia yang profesional dan rapi.
- Manfaatkan format Markdown (tabel, poin-poin, tebal) agar mudah dibaca.
        `,
      }
    });

    res.status(200).json({ result: response.text });
  } catch (ex) {
    res.status(500).json({ error: ex.message })
  }
})