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
    const token = data.access_token;

    // 将 Token 封装成 Decap CMS 认识的格式并发送给父级页面，随后自动关闭弹窗
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>授权成功</title></head>
      <body>
        <p>授权成功，正在返回系统后台...</p>
        <script>
          const token = "${token}";
          const provider = "github";
          const message = "authorization:github:success:" + JSON.stringify({ token, provider });
          window.opener.postMessage(message, new URL(window.location.href).origin);
          window.close();
        </script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  } catch (error) {
    return new Response("授权过程中发生错误", { status: 500 });
  }
}