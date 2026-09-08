$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = Get-Location }

$candidates = @(
  (Join-Path $root 'branding\loreguard.png'),
  (Join-Path $env:USERPROFILE '.cursor\projects\d-experimental-projects-epub-reader\assets\d__experimental_projects_epub_reader_loreguard-a-book-reading-app--i-need-a-logo-with-a.png')
)
$src = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $src) { throw 'LoreGuard logo PNG not found' }

New-Item -ItemType Directory -Force -Path (Join-Path $root 'branding') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $root 'public') | Out-Null
Copy-Item $src (Join-Path $root 'branding\loreguard.png') -Force
Copy-Item $src (Join-Path $root 'public\logo.png') -Force

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Join-Path $root 'branding\loreguard.png'))
$navy = [System.Drawing.Color]::FromArgb(255, 11, 18, 32)

function Save-Fit([int]$width, [int]$height, [string]$dest, [double]$pad = 0.08) {
  $dir = Split-Path $dest
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $bmp = New-Object System.Drawing.Bitmap $width, $height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($navy)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $availW = $width * (1 - 2 * $pad)
  $availH = $height * (1 - 2 * $pad)
  $scale = [Math]::Min($availW / $img.Width, $availH / $img.Height)
  $w = [int]($img.Width * $scale)
  $h = [int]($img.Height * $scale)
  $x = [int](($width - $w) / 2)
  $y = [int](($height - $h) / 2)
  $g.DrawImage($img, $x, $y, $w, $h)
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

$res = Join-Path $root 'android\app\src\main\res'
$densities = @{
  'mipmap-mdpi'    = 48
  'mipmap-hdpi'    = 72
  'mipmap-xhdpi'   = 96
  'mipmap-xxhdpi'  = 144
  'mipmap-xxxhdpi' = 192
}
$fg = @{
  'mipmap-mdpi'    = 108
  'mipmap-hdpi'    = 162
  'mipmap-xhdpi'   = 216
  'mipmap-xxhdpi'  = 324
  'mipmap-xxxhdpi' = 432
}

foreach ($folder in $densities.Keys) {
  $size = $densities[$folder]
  Save-Fit $size $size (Join-Path $res "$folder\ic_launcher.png") 0.06
  Save-Fit $size $size (Join-Path $res "$folder\ic_launcher_round.png") 0.06
  Save-Fit $fg[$folder] $fg[$folder] (Join-Path $res "$folder\ic_launcher_foreground.png") 0.16
}

Save-Fit 720 720 (Join-Path $res 'drawable\splash_logo.png') 0.08
Save-Fit 180 180 (Join-Path $root 'public\apple-touch-icon.png') 0.06
Save-Fit 32 32 (Join-Path $root 'public\favicon.png') 0.04

Get-ChildItem (Join-Path $root 'android\app\src\main\res') -Recurse -Filter 'splash.png' -ErrorAction SilentlyContinue | Remove-Item -Force

$img.Dispose()
Write-Host "Wrote LoreGuard icons from $src"
