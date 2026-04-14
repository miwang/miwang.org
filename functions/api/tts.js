export async function onRequest(context) {
  // 从 Cloudflare 环境变量中读取密钥
  const AZURE_KEY = context.env.AZURE_TTS_KEY;
  const AZURE_REGION = context.env.AZURE_REGION; // 例如: eastus

  const url = new URL(context.request.url);
  const text = url.searchParams.get('text');

  if (!text) return new Response("Missing text", { status: 400 });

  // 微软 Azure TTS 标准配置：使用“晓晓”声音，语速设为稍微缓慢适合教学
  const ssml = `
    <speak version='1.0' xml:lang='zh-CN'>
      <voice xml:lang='zh-CN' xml:gender='Female' name='zh-CN-XiaoxiaoNeural'>
        <prosody rate="-10%">
          ${text}
        </prosody>
      </voice>
    </speak>
  `;

  try {
    const response = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'MECC_Reader'
      },
      body: ssml
    });

    if (!response.ok) {
        const err = await response.text();
        return new Response("Azure API Error: " + err, { status: response.status });
    }

    const audioData = await response.arrayBuffer();
    return new Response(audioData, {
      headers: { 'Content-Type': 'audio/mpeg' }
    });
  } catch (e) {
    return new Response("Server Error: " + e.message, { status: 500 });
  }
}