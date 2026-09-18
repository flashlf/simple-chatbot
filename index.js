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