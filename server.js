import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PORT = process.env.PORT || 3000;

/* 🔥 텍스트 검색 */
app.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
너는 쇼핑 추천 AI다.

사용자가 검색하면:
- 실제로 살 수 있을 것 같은 상품 3~5개 추천
- JSON으로만 답해

형식:
{
  "products": [
    {
      "title": "...",
      "description": "...",
      "price": "...",
      "image": "https://placehold.co/600x600",
      "link": "https://example.com",
      "badge": "추천"
    }
  ]
}
`
        },
        {
          role: "user",
          content: query
        }
      ]
    });

    const text = response.choices[0].message.content;

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { products: [] };
    }

    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "검색 실패" });
  }
});

/* 🔥 이미지 분석 */
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const base64 = req.file.buffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
너는 이미지 분석 + 쇼핑 추천 AI다.

이미지를 보고:
1. 물건 이름 추정
2. 비슷한 상품 3~5개 추천

JSON만 반환:

{
  "detectedName": "...",
  "products": [
    {
      "title": "...",
      "description": "...",
      "price": "...",
      "image": "https://placehold.co/600x600",
      "link": "https://example.com",
      "badge": "인기"
    }
  ]
}
`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "이게 뭐야?" },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64}`
              }
            }
          ]
        }
      ]
    });

    const text = response.choices[0].message.content;

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { detectedName: "알 수 없음", products: [] };
    }

    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "분석 실패" });
  }
});

/* 서버 실행 */
app.listen(PORT, () => {
  console.log(`🔥 서버 실행됨 → http://localhost:${PORT}`);
});