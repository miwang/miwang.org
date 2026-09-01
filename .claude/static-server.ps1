# Minimal static file server for previewing this site locally.
# No Node/npm dependency — used because this machine doesn't have Node on PATH,
# and the actual site here is plain static HTML/CSS/JS (no build step needed).
param(
    [int]$Port = 3333
)

$Root = Split-Path -Parent $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
    $listener.Start()
} catch {
    Write-Error "Failed to bind http://localhost:$Port/ - $($_.Exception.Message)"
    exit 1
}
Write-Host "Serving $Root at http://localhost:$Port/"

$mime = @{
    '.html'  = 'text/html; charset=utf-8'
    '.htm'   = 'text/html; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.mjs'   = 'application/javascript; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.gif'   = 'image/gif'
    '.webp'  = 'image/webp'
    '.svg'   = 'image/svg+xml'
    '.ico'   = 'image/x-icon'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf'   = 'font/ttf'
    '.mp3'   = 'audio/mpeg'
    '.mp4'   = 'video/mp4'
    '.txt'   = 'text/plain; charset=utf-8'
    '.pdf'   = 'application/pdf'
    '.xml'   = 'application/xml; charset=utf-8'
}

$rootFull = [System.IO.Path]::GetFullPath($Root)

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    try {
        $urlPath = [Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($urlPath -eq '/') { $urlPath = '/index.html' }

        $candidate = [System.IO.Path]::GetFullPath((Join-Path $rootFull $urlPath.TrimStart('/')))

        if (-not $candidate.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
        }
        elseif (Test-Path -LiteralPath $candidate -PathType Container) {
            $indexPath = Join-Path $candidate 'index.html'
            if (Test-Path -LiteralPath $indexPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($indexPath)
                $response.ContentType = 'text/html; charset=utf-8'
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
            }
        }
        elseif (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
            $ct = $mime[$ext]
            if (-not $ct) { $ct = 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($candidate)
            $response.ContentType = $ct
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        try {
            $response.StatusCode = 500
        } catch {}
    } finally {
        $response.OutputStream.Close()
    }
}
