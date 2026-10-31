import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const VOICE = "pt-BR-AntonioNeural";

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  let tts;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 3500) : "";
    if (!text) {
      res.status(400).json({ error: "Não há texto para transformar em voz." });
      return;
    }

    tts = new MsEdgeTTS({
      connectionTimeoutMs: 12000,
      synthesisTimeoutMs: 45000
    });

    await tts.setMetadata(
      VOICE,
      OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3
    );

    const { audioStream } = await tts.toStream(escapeXml(text), {
      rate: 0,
      pitch: "-2Hz"
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("X-Content-Type-Options", "nosniff");

    let streamFinished = false;
    const closeTts = () => {
      try { tts?.close(); } catch {}
    };

    res.on("close", () => {
      if (!streamFinished) {
        audioStream.destroy();
        closeTts();
      }
    });

    audioStream.on("error", (error) => {
      console.error("Microsoft Edge TTS stream error:", error?.message || "unknown");
      closeTts();
      if (!res.headersSent) {
        res.status(502).json({ error: "O serviço gratuito de voz falhou. Tente novamente." });
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    audioStream.on("end", () => {
      streamFinished = true;
      closeTts();
    });

    audioStream.pipe(res);
  } catch (error) {
    try { tts?.close(); } catch {}
    console.error("Microsoft Edge TTS error:", error?.message || "unknown");
    if (!res.headersSent) {
      res.status(error?.message?.toLowerCase().includes("timeout") ? 504 : 502)
        .json({ error: "Não consegui gerar a voz agora. Tente novamente em instantes." });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}
