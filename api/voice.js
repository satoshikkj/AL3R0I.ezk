export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    res.status(503).json({
      error: "Configure ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID nas variáveis de ambiente da Vercel."
    });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 4500) : "";
    if (!text) {
      res.status(400).json({ error: "Não há texto para transformar em voz." });
      return;
    }

    const endpoint = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`);
    endpoint.searchParams.set("model_id", "eleven_flash_v2_5");
    endpoint.searchParams.set("output_format", "mp3_44100_128");
    endpoint.searchParams.set("optimize_streaming_latency", "2");

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        language_code: "por",
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.78,
          style: 0.22,
          use_speaker_boost: true
        }
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("ElevenLabs TTS error:", upstream.status, detail.slice(0, 300));
      res.status(upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status)
        .json({ error: upstream.status === 401 || upstream.status === 403
          ? "A chave da ElevenLabs é inválida ou não tem acesso à API."
          : upstream.status === 429
            ? "O limite de créditos ou requisições da ElevenLabs foi atingido."
            : "A ElevenLabs não conseguiu gerar o áudio agora." });
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    let clientClosed = false;
    res.on("close", () => { clientClosed = true; reader.cancel().catch(() => {}); });

    while (!clientClosed) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
    if (!clientClosed) res.end();
  } catch (error) {
    console.error("Voice handler error:", error?.name || "Error");
    if (!res.headersSent) {
      res.status(error?.name === "TimeoutError" ? 504 : 502)
        .json({ error: error?.name === "TimeoutError"
          ? "A geração de voz demorou demais. Tente novamente."
          : "Falha ao conectar ao serviço de voz." });
    } else {
      res.end();
    }
  }
}
