export async function onRequest(context) {
  const client_id = context.env.GITHUB_CLIENT_ID;
  const client_secret = context.env.GITHUB_CLIENT_SECRET;
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');

  try {
    // 拿着授权码向 GitHub 换取 Access Token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });
    
    const data = await response.json();
    
    // 【重点排错】如果 GitHub 拒绝了密钥，把真实原因显示在屏幕上
    if (data.error) {
       return new Response(
         `<h3>GitHub 拒绝了授权</h3><p>错误代码: ${data.error}</p><p>详细信息: ${data.error_description}</p><p>👉 解决建议：请检查 Cloudflare 环境变量中的 GITHUB_CLIENT_SECRET 是否填错，或者多复制了空格。</p>`, 
         { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
       );
    }

    const token = data.access_token;

    // 将 Token 封装并发送给父级页面
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>授权成功</title></head>
      <body>
        <p>✅ 拿到 GitHub 钥匙了，正在开锁...</p>
        <p id="error-msg" style="color: red;"></p>
        <script>
          try {
            const token = "${token}";
            const provider = "github";
            const message = "authorization:github:success:" + JSON.stringify({ token, provider });
            
            // 兼容性更强的回传目标地址
            const targetOrigin = window.opener ? window.opener.location.origin : new URL(window.location.href).origin;
            
            window.opener.postMessage(message, targetOrigin);
            
            // 延迟 0.5 秒关闭，确保消息飞到主页面
            setTimeout(() => window.close(), 500); 
          } catch (e) {
            document.getElementById('error-msg').innerText = "回传失败：" + e.message;
          }
        </script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  } catch (error) {
    return new Response("服务器连接发生错误: " + error.message, { status: 500 });
  }
}