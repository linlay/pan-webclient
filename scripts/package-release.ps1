param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [ValidateSet("amd64", "arm64")]
    [string]$Arch
)

$ErrorActionPreference = "Stop"

if ($Version -notmatch '^v\d+\.\d+\.\d+$') {
    throw "Version must match vX.Y.Z"
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

Require-Command docker
Require-Command go
Require-Command tar

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$RepoName = "pan-webclient"
$ApiImageName = "pan-webclient-api"
$FrontendImageName = "pan-webclient-frontend"
$Platform = "linux/$Arch"
$PlatformSlug = "linux-$Arch"
$ReleaseRoot = Join-Path $RepoRoot "dist/release"
$BuildDir = Join-Path $ReleaseRoot "build/$Version/$PlatformSlug"
$ImagesDir = Join-Path $BuildDir "images"
$BinDir = Join-Path $BuildDir "bin"
$BundleDir = Join-Path $ReleaseRoot "bundles"
$BundlePath = Join-Path $BundleDir "$RepoName-$Version-$PlatformSlug.tar.gz"
$ManifestFile = Join-Path $BuildDir "release-manifest.env"
$ApiImage = "$ApiImageName:$Version-$PlatformSlug"
$FrontendImage = "$FrontendImageName:$Version-$PlatformSlug"

New-Item -ItemType Directory -Force -Path $ImagesDir, $BinDir, $BundleDir | Out-Null

Push-Location $RepoRoot
try {
    docker buildx build --platform $Platform --file backend/Dockerfile --tag $ApiImage --output "type=docker,dest=$ImagesDir/$ApiImageName.tar" .
    docker buildx build --platform $Platform --file frontend/Dockerfile --tag $FrontendImage --output "type=docker,dest=$ImagesDir/$FrontendImageName.tar" .

    Push-Location (Join-Path $RepoRoot "backend")
    try {
        $env:CGO_ENABLED = "0"
        $env:GOOS = "linux"
        $env:GOARCH = $Arch
        go build -o (Join-Path $BinDir "composemounts") ./cmd/composemounts
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}

@(
    "REPO_NAME=$RepoName"
    "VERSION=$Version"
    "ARCH=$Arch"
    "PLATFORM=$Platform"
    "API_IMAGE_NAME=$ApiImageName"
    "FRONTEND_IMAGE_NAME=$FrontendImageName"
    "API_IMAGE=$ApiImage"
    "FRONTEND_IMAGE=$FrontendImage"
) | Set-Content -Path $ManifestFile -NoNewline:$false

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("pan-webclient-release-" + [System.Guid]::NewGuid().ToString("N"))
$BundleRoot = Join-Path $TempRoot $RepoName

New-Item -ItemType Directory -Force -Path `
    (Join-Path $BundleRoot "bin"), `
    (Join-Path $BundleRoot "configs/mounts"), `
    (Join-Path $BundleRoot "data"), `
    (Join-Path $BundleRoot "images") | Out-Null

Copy-Item (Join-Path $RepoRoot "release/docker-compose.release.yml") (Join-Path $BundleRoot "docker-compose.release.yml")
Copy-Item (Join-Path $RepoRoot "release/start.sh") (Join-Path $BundleRoot "start.sh")
Copy-Item (Join-Path $RepoRoot "release/stop.sh") (Join-Path $BundleRoot "stop.sh")
Copy-Item (Join-Path $RepoRoot ".env.example") (Join-Path $BundleRoot ".env.example")
Copy-Item (Join-Path $RepoRoot "configs/local-public-key.example.pem") (Join-Path $BundleRoot "configs/local-public-key.example.pem")
Copy-Item $ManifestFile (Join-Path $BundleRoot "release-manifest.env")
Copy-Item (Join-Path $BinDir "composemounts") (Join-Path $BundleRoot "bin/composemounts")
Copy-Item (Join-Path $ImagesDir "$ApiImageName.tar") (Join-Path $BundleRoot "images/$ApiImageName.tar")
Copy-Item (Join-Path $ImagesDir "$FrontendImageName.tar") (Join-Path $BundleRoot "images/$FrontendImageName.tar")

Get-ChildItem (Join-Path $RepoRoot "configs/mounts") -Filter "*.example.json" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $BundleRoot "configs/mounts/$($_.Name)")
}

@"
$RepoName $Version
Architecture: $Arch

This bundle is intended for manual upload and manual deployment.

Deploy steps:
1. Copy .env.example to .env and fill in real values.
2. Copy configs/local-public-key.example.pem to configs/local-public-key.pem.
3. If needed, copy configs/mounts/*.example.json to *.json and adjust source/path.
4. Run ./start.sh
5. Use ./stop.sh to stop the stack

Manual upload targets:
- GitHub Release: upload $RepoName-$Version-$PlatformSlug.tar.gz
- Your own server: upload to $RepoName/$Version/
"@ | Set-Content -Path (Join-Path $BundleRoot "RELEASE_NOTES.txt")

$ChecksumLines = New-Object System.Collections.Generic.List[string]
Get-ChildItem $BundleRoot -Recurse -File | Where-Object { $_.Name -ne "checksums.txt" } | Sort-Object FullName | ForEach-Object {
    $relativePath = $_.FullName.Substring($BundleRoot.Length + 1).Replace("\", "/")
    $hash = (Get-FileHash -Algorithm SHA256 -Path $_.FullName).Hash.ToLower()
    $ChecksumLines.Add("$hash  $relativePath")
}
$ChecksumLines | Set-Content -Path (Join-Path $BundleRoot "checksums.txt")

tar -czf $BundlePath -C $TempRoot $RepoName

Write-Host "[release] packaged $BundlePath"
