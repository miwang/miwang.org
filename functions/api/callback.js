export async function onRequest(context) {
  const client_id = context.env.GITHUB_CLIENT_ID;
  const client_secret = context.env.GITHUB_CLIENT_SECRET;
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');

  try {
    // 向 GitHub 换取 Access Token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });
    
    const data = await response.json();
    
    if (data.error) {
       return new Response(
         `<h3>GitHub 拒绝了授权</h3><p>错误代码: ${data.error}</p><p>详细信息: ${data.error_description}</p>`, 
         { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
       );
    }

    const token = data.access_token;

    // 【关键修复】：加入 Decap CMS 标准的双向握手通信机制
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>授权成功</title></head>
      <body>
        <p>✅ 拿到 GitHub 钥匙了，正在和后台握手开锁...</p>
        <script>
          const token = "${token}";
          const provider = "github";
          
          // 第二步：监听主系统发回来的确认信号，收到后再把真正的 Token 发过去
          window.addEventListener("message", (event) => {
            if (event.data === "authorizing:" + provider) {
              const message = "authorization:" + provider + ":success:" + JSON.stringify({ token, provider });
              // 使用对方认可的安全源 (event.origin) 回传数据
              window.opener.postMessage(message, event.origin);
              // 大功告成，关闭弹窗
              setTimeout(() => window.close(), 500);
            }
          });

          // 第一步：先向主系统发送“敲门”信号
          if (window.opener) {
            window.opener.postMessage("authorizing:" + provider, "*");
          } else {
            document.body.innerHTML += "<p style='color:red;'>错误：找不到主页面，请从后台系统的 Login 按钮点击进入。</p>";
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