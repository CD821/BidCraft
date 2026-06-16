param(
  [string]$Root = (Join-Path $PSScriptRoot "..\dist"),
  [int]$Port = 8787
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$listener = [System.Net.Sockets.TcpListener]::new(
  [System.Net.IPAddress]::Loopback,
  $Port
)

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
  ".ico" = "image/x-icon"
  ".woff2" = "font/woff2"
}

$listener.Start()

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new(
        $stream,
        [System.Text.Encoding]::ASCII,
        $false,
        1024,
        $true
      )
      $requestLine = $reader.ReadLine()
      while (($line = $reader.ReadLine()) -ne "") {
        if ($null -eq $line) { break }
      }

      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
      $parts = $requestLine.Split(" ")
      $requestPath = [System.Uri]::UnescapeDataString(
        ($parts[1].Split("?")[0]).TrimStart("/")
      )

      if ($requestPath -eq "__quit") {
        $body = [System.Text.Encoding]::UTF8.GetBytes("BidCraft server stopped.")
        $header = "HTTP/1.1 200 OK`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($body, 0, $body.Length)
        break
      }

      if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = "index.html"
      }

      $candidate = [System.IO.Path]::GetFullPath(
        (Join-Path $resolvedRoot $requestPath)
      )
      if (-not $candidate.StartsWith($resolvedRoot)) {
        $candidate = Join-Path $resolvedRoot "index.html"
      }
      if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $candidate = Join-Path $resolvedRoot "index.html"
      }

      $body = [System.IO.File]::ReadAllBytes($candidate)
      $extension = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
      $mime = if ($mimeTypes.ContainsKey($extension)) {
        $mimeTypes[$extension]
      } else {
        "application/octet-stream"
      }
      $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
    } finally {
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
}
