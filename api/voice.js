const API = "https://api.tts.ai/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return res.status(400).json({ error: "Não há texto para transformar em voz." });
    if (text.length > 500) return res.status(413).json({ error: "Este trecho passou do limite de 500 caracteres." });
    const jobResponse = await fetch(API + "/tts/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ model: "kokoro", text, voice: "pm_alex", language: "pt", speed: 1.25, format: "mp3" }),
      signal: AbortSignal.timeout(20000)
    });
    const job = await jobResponse.json().catch(() => ({}));
    if (!jobResponse.ok || !job.uuid) {
      console.error("TTS.ai submit error:", job);
      return res.status(jobResponse.status || 502).json({ error: job?.detail || job?.error || "O serviço Kokoro não aceitou o texto." });
    }
    let result = null;
    for (let attempt = 0; attempt < 35; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(API + "/speech/results/?uuid=" + encodeURIComponent(job.uuid), { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) });
      result = await statusResponse.json().catch(() => ({}));
      if (!statusResponse.ok) throw new Error(result?.error || "Falha ao consultar a geração de voz.");
      if (result.status === "completed" && result.result_url) break;
      if (result.status === "failed") throw new Error(result.error || "A geração de voz falhou.");
      result = null;
    }
    if (!result?.result_url) throw new Error("O Kokoro demorou demais para gerar o áudio.");
    const audioResponse = await fetch(result.result_url, { signal: AbortSignal.timeout(20000) });
    if (!audioResponse.ok) throw new Error("Não consegui baixar o áudio gerado.");
    const audio = Buffer.from(await audioResponse.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audio.length));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(audio);
  } catch (error) {
    console.error("Kokoro TTS error:", error?.message || "unknown");
    if (!res.headersSent) return res.status(502).json({ error: error?.name === "TimeoutError" ? "O serviço de voz demorou demais. Tente novamente." : (error?.message || "Não consegui gerar a voz agora.") });
    return res.end();
  }
}
