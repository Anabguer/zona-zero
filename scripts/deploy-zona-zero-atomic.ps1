#Requires -Version 5.1
param()

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Htdocs = Split-Path -Parent (Split-Path -Parent $Root)
$CfgPath = Join-Path $Htdocs 'anabel\deploy\hostalia.publish.local.json'
$LogsDir = Join-Path $Root 'scripts\deploy-logs'
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

$assets = Get-Content (Join-Path $Root 'includes\zz-assets.php') -Raw
if ($assets -notmatch "ZZ_ASSET_V\s*=\s*'(\d+)'") {
    throw 'includes/zz-assets.php sin ZZ_ASSET_V'
}
$ver = $Matches[1]
Write-Host "ZZ_ASSET_V=$ver - deploy atomico del grafo"

$config = Get-Content -LiteralPath $CfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
$winscp = 'C:\Users\agl03\AppData\Local\Programs\WinSCP\WinSCP.com'
if ($config.HOSTALIA_WINSCP_PATH -and (Test-Path ([string]$config.HOSTALIA_WINSCP_PATH))) {
    $winscp = [string]$config.HOSTALIA_WINSCP_PATH
}
$encUser = [Uri]::EscapeDataString([string]$config.HOSTALIA_USER)
$encPass = [Uri]::EscapeDataString([string]$config.HOSTALIA_PASSWORD)
$hostName = [string]$config.HOSTALIA_HOST
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $LogsDir "atomic-$ts.log"
$scriptPath = Join-Path $env:TEMP "zz-atomic-$ts.script"

$js = (Join-Path $Root 'js').Replace('\', '/')
$css = (Join-Path $Root 'css').Replace('\', '/')
$content = (Join-Path $Root 'content').Replace('\', '/')
$api = (Join-Path $Root 'api').Replace('\', '/')
$inc = (Join-Path $Root 'includes').Replace('\', '/')
$indexPhp = Join-Path $Root 'index.php'
$playPhp = Join-Path $Root 'play.php'
$htaccess = Join-Path $Root '.htaccess'
$metaJson = Join-Path $Root 'meta.json'
$manifest = Join-Path $Root 'manifest.webmanifest'
$swJs = Join-Path $Root 'sw.js'
$assetsLogo = Join-Path $Root 'assets\logo.svg'
$icon192 = Join-Path $Root 'assets\icon-192.png'
$icon512 = Join-Path $Root 'assets\icon-512.png'
$cityIso = Join-Path $Root 'assets\art\terrain\city-iso.png'
$colonyDirt = Join-Path $Root 'assets\art\terrain\colony-iso-world-v3.png'
$dwellingV1 = Join-Path $Root 'assets\art\buildings\dwelling-v1b.png'
$farmIso = Join-Path $Root 'assets\art\buildings\farm-iso.png'
$wellIso = Join-Path $Root 'assets\art\buildings\well-iso.png'
$propTree = Join-Path $Root 'assets\art\props\tree-dead.png'
$propCar = Join-Path $Root 'assets\art\props\car-wreck.png'
$propScrap = Join-Path $Root 'assets\art\props\scrap-pile.png'

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('option batch abort')
[void]$sb.AppendLine('option confirm off')
[void]$sb.AppendLine('option transfer binary')
[void]$sb.AppendLine("open ftp://${encUser}:${encPass}@${hostName}:21/ -passive=on")
[void]$sb.AppendLine("synchronize remote -mirror `"$js`" /juegos/zona-zero/js")
[void]$sb.AppendLine("synchronize remote -mirror `"$css`" /juegos/zona-zero/css")
[void]$sb.AppendLine("synchronize remote -mirror `"$content`" /juegos/zona-zero/content")
[void]$sb.AppendLine("synchronize remote -mirror `"$api`" /juegos/zona-zero/api")
[void]$sb.AppendLine("synchronize remote -mirror `"$inc`" /juegos/zona-zero/includes")
[void]$sb.AppendLine("put `"$indexPhp`" /juegos/zona-zero/index.php")
[void]$sb.AppendLine("put `"$playPhp`" /juegos/zona-zero/play.php")
[void]$sb.AppendLine("put `"$htaccess`" /juegos/zona-zero/.htaccess")
[void]$sb.AppendLine("put `"$metaJson`" /juegos/zona-zero/meta.json")
[void]$sb.AppendLine("put `"$manifest`" /juegos/zona-zero/manifest.webmanifest")
[void]$sb.AppendLine("put `"$swJs`" /juegos/zona-zero/sw.js")
[void]$sb.AppendLine("put `"$assetsLogo`" /juegos/zona-zero/assets/logo.svg")
[void]$sb.AppendLine("put `"$icon192`" /juegos/zona-zero/assets/icon-192.png")
[void]$sb.AppendLine("put `"$icon512`" /juegos/zona-zero/assets/icon-512.png")
[void]$sb.AppendLine("put `"$cityIso`" /juegos/zona-zero/assets/art/terrain/city-iso.png")
[void]$sb.AppendLine("put `"$colonyDirt`" /juegos/zona-zero/assets/art/terrain/colony-iso-world-v3.png")
[void]$sb.AppendLine("put `"$dwellingV1`" /juegos/zona-zero/assets/art/buildings/dwelling-v1b.png")
[void]$sb.AppendLine("put `"$farmIso`" /juegos/zona-zero/assets/art/buildings/farm-iso.png")
[void]$sb.AppendLine("put `"$wellIso`" /juegos/zona-zero/assets/art/buildings/well-iso.png")
[void]$sb.AppendLine('option batch continue')
[void]$sb.AppendLine('mkdir /juegos/zona-zero/assets/art/props')
[void]$sb.AppendLine('option batch abort')
[void]$sb.AppendLine("put `"$propTree`" /juegos/zona-zero/assets/art/props/tree-dead.png")
[void]$sb.AppendLine("put `"$propCar`" /juegos/zona-zero/assets/art/props/car-wreck.png")
[void]$sb.AppendLine("put `"$propScrap`" /juegos/zona-zero/assets/art/props/scrap-pile.png")
[void]$sb.AppendLine('exit')

[System.IO.File]::WriteAllText($scriptPath, $sb.ToString())
& $winscp /ini=nul /log=$log /script=$scriptPath
if ($LASTEXITCODE -ne 0) {
    throw "WinSCP failed: $LASTEXITCODE - ver $log"
}
Write-Host "OK deploy atomico v=$ver"
