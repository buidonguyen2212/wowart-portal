// Vercel Serverless Function — AI Proxy
// Giấu API key phía server, không lộ ra browser

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, context } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  const AI_PROVIDER = process.env.AI_PROVIDER || "gemini"; // "gemini" or "claude"

  const systemPrompt = `Bạn là chuyên gia quản trị giáo dục mỹ thuật trẻ em với 20 năm kinh nghiệm tại Việt Nam. Bạn am hiểu marketing, sales, vận hành, tài chính cho mô hình trung tâm nghệ thuật trẻ em phân khúc trung-cao.

Phân tích data WOW ART và đưa ra tư vấn THỰC TẾ, CỤ THỂ, có thể HÀNH ĐỘNG NGAY.

${context}

CÂU HỎI: ${prompt}

Trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc rõ ràng. Ưu tiên đề xuất hành động cụ thể với timeline. Dùng emoji phù hợp.`;

  try {
    let text = "";

    if (AI_PROVIDER === "claude" && CLAUDE_KEY) {
      // ===== CLAUDE API =====
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: systemPrompt }]
        })
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error.message || "Claude API error");
      text = d.content?.map(c => c.text || "").join("") || "Không nhận được phản hồi.";

    } else if (GEMINI_KEY) {
      // ===== GEMINI API (FREE) =====
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1500,
            }
          })
        }
      );
      const d = await resp.json();
      if (d.error) throw new Error(d.error.message || "Gemini API error");
      text = d.candidates?.[0]?.content?.parts?.[0]?.text || "Không nhận được phản hồi.";

    } else {
      return res.status(500).json({ error: "Chưa cấu hình API key. Thêm GEMINI_API_KEY hoặc ANTHROPIC_API_KEY vào Vercel Environment Variables." });
    }

    return res.status(200).json({ text, provider: AI_PROVIDER === "claude" && CLAUDE_KEY ? "claude" : "gemini" });

  } catch (e) {
    console.error("AI Error:", e);
    return res.status(500).json({ error: e.message || "AI request failed" });
  }
}
