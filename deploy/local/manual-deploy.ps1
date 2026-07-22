<#
.SYNOPSIS
GitHub Actions 장애 시 로컬 PC에서 운영 서버로 수동 배포한다.

.DESCRIPTION
- API는 로컬에서 bootJar를 빌드한 뒤 /app/spring-boot/app.jar.new 로 전송한다.
- WEB은 기본적으로 서버의 임시 디렉토리에서 npm ci/build를 수행한다.
  Next.js standalone에는 OS/CPU별 네이티브 의존성이 포함될 수 있으므로,
  Windows 로컬 빌드 산출물을 그대로 운영 Ubuntu aarch64 서버에 올리는 방식은 기본값으로 쓰지 않는다.
- 최종 교체/재시작/헬스체크/롤백은 기존 서버 스크립트(/app/scripts/deploy-*.sh)를 그대로 사용한다.

.EXAMPLE
.\deploy\local\manual-deploy.ps1 -Target both -HostName CHANGE_ME_SERVER_IP -User ubuntu -Port 22 -KeyPath "$env:USERPROFILE\.ssh\caskbycask"

.EXAMPLE
.\deploy\local\manual-deploy.ps1 -Target web -HostName CHANGE_ME_SERVER_IP -User ubuntu -WebBuildMode remote
#>

[CmdletBinding()]
param(
    [ValidateSet('both', 'api', 'web')]
    [string]$Target = 'both',

    [Parameter(Mandatory = $true)]
    [string]$HostName,

    [Parameter(Mandatory = $true)]
    [string]$User,

    [int]$Port = 22,

    [string]$KeyPath,

    [ValidateSet('remote', 'local')]
    [string]$WebBuildMode = 'remote',

    [switch]$SkipBuild,

    [switch]$SkipNpmCi,

    [switch]$SkipScriptUpload,

    [string]$JavaHome,

    [switch]$AllowCrossPlatformWebBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Warning 'GitHub Actions·다른 수동 배포·수동 롤백이 진행 중이면 이 작업을 시작하지 마세요. .deploy.lock은 최종 교체 구간만 보호합니다.'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$artifactRoot = Join-Path $repoRoot 'deploy\.manual-artifacts'
$apiArtifactDir = Join-Path $artifactRoot 'api'
$webArtifactDir = Join-Path $artifactRoot 'web'

function Write-Step {
    param([string]$Message)
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "필수 명령을 찾을 수 없습니다: $Name"
    }
}

function Get-SshBaseArgs {
    $args = @()
    if ($KeyPath) {
        $resolvedKey = (Resolve-Path $KeyPath).Path
        $args += @('-i', $resolvedKey)
    }
    $args += @('-p', "$Port", "${User}@${HostName}")
    return $args
}

function Get-ScpBaseArgs {
    $args = @()
    if ($KeyPath) {
        $resolvedKey = (Resolve-Path $KeyPath).Path
        $args += @('-i', $resolvedKey)
    }
    $args += @('-P', "$Port")
    return $args
}

function Invoke-Checked {
    param(
        [string]$Name,
        [scriptblock]$Block
    )
    & $Block
    if ($LASTEXITCODE -ne 0) {
        throw "$Name 실패 (exit code: $LASTEXITCODE)"
    }
}

function Invoke-Remote {
    param([string]$Command)
    $sshArgs = Get-SshBaseArgs
    Invoke-Checked "ssh" { & ssh @sshArgs $Command }
}

function Copy-ToRemote {
    param(
        [string[]]$Sources,
        [string]$Destination
    )
    $scpArgs = Get-ScpBaseArgs
    $destinationSpec = "${User}@${HostName}:$Destination"
    Invoke-Checked "scp" { & scp @scpArgs @Sources $destinationSpec }
}

function Ensure-ArtifactDirs {
    New-Item -ItemType Directory -Force -Path $apiArtifactDir, $webArtifactDir | Out-Null
}

function Build-Api {
    Write-Step 'API bootJar 빌드'
    if ($JavaHome) {
        $env:JAVA_HOME = (Resolve-Path $JavaHome).Path
        $env:Path = "$env:JAVA_HOME\bin;$env:Path"
    }

    $apiDir = Join-Path $repoRoot 'caskbycask-api'
    $gradle = Join-Path $apiDir 'gradlew.bat'
    if (-not (Test-Path $gradle)) {
        $gradle = Join-Path $apiDir 'gradlew'
    }
    if (-not (Test-Path $gradle)) {
        throw 'Gradle wrapper를 찾을 수 없습니다.'
    }

    Push-Location $apiDir
    try {
        Invoke-Checked 'gradle bootJar' { & $gradle clean bootJar -x test --no-daemon }
        $jar = Get-ChildItem -Path (Join-Path $apiDir 'build\libs') -Filter '*.jar' |
            Where-Object { $_.Name -notlike '*plain*' } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if (-not $jar) {
            throw '빌드된 API jar를 찾을 수 없습니다.'
        }
        Copy-Item -LiteralPath $jar.FullName -Destination (Join-Path $apiArtifactDir 'app.jar') -Force
        Write-Host "API 산출물: $($jar.FullName)"
    }
    finally {
        Pop-Location
    }
}

function Package-WebSource {
    Write-Step 'WEB 소스 패키징'
    Require-Command 'tar'

    $webDir = Join-Path $repoRoot 'caskbycask-web'
    $sourceArchive = Join-Path $webArtifactDir 'web-src.tar.gz'
    if (Test-Path $sourceArchive) {
        Remove-Item -LiteralPath $sourceArchive -Force
    }

    Push-Location $webDir
    try {
        Invoke-Checked 'web source tar' {
            & tar -czf $sourceArchive `
                --exclude node_modules `
                --exclude .next `
                --exclude .turbo `
                --exclude '*.log' `
                .
        }
    }
    finally {
        Pop-Location
    }

    return $sourceArchive
}

function Build-WebLocal {
    Write-Step 'WEB standalone 로컬 빌드'
    Require-Command 'npm'
    Require-Command 'tar'

    $isWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
        [System.Runtime.InteropServices.OSPlatform]::Windows
    )
    if ($isWindows -and -not $AllowCrossPlatformWebBuild) {
        throw 'Windows 로컬 WEB 빌드는 운영 Ubuntu aarch64와 네이티브 의존성이 달라질 수 있습니다. WEB은 기본 remote 빌드를 사용하거나, 위험을 알고 있으면 -AllowCrossPlatformWebBuild를 명시하세요.'
    }

    $webDir = Join-Path $repoRoot 'caskbycask-web'
    Push-Location $webDir
    try {
        if (-not $SkipNpmCi) {
            Invoke-Checked 'npm ci' { & npm ci }
        }
        Invoke-Checked 'npm run build' { & npm run build }

        $standalone = Join-Path $webDir '.next\standalone'
        if (-not (Test-Path $standalone)) {
            throw 'Next.js standalone 산출물을 찾을 수 없습니다: .next/standalone'
        }

        $standaloneStatic = Join-Path $standalone '.next\static'
        if (Test-Path $standaloneStatic) {
            Remove-Item -LiteralPath $standaloneStatic -Recurse -Force
        }
        New-Item -ItemType Directory -Force -Path $standaloneStatic | Out-Null
        Copy-Item -Path (Join-Path $webDir '.next\static\*') -Destination $standaloneStatic -Recurse -Force

        $publicSrc = Join-Path $webDir 'public'
        $publicDest = Join-Path $standalone 'public'
        if (Test-Path $publicSrc) {
            if (Test-Path $publicDest) {
                Remove-Item -LiteralPath $publicDest -Recurse -Force
            }
            Copy-Item -LiteralPath $publicSrc -Destination $publicDest -Recurse -Force
        }

        $archive = Join-Path $webArtifactDir 'web-dist.tar.gz'
        if (Test-Path $archive) {
            Remove-Item -LiteralPath $archive -Force
        }
        Invoke-Checked 'web dist tar' { & tar -czf $archive -C $standalone . }
        return $archive
    }
    finally {
        Pop-Location
    }
}

function Upload-Scripts {
    if ($SkipScriptUpload) {
        Write-Host '운영 스크립트 업로드 건너뜀 (-SkipScriptUpload)'
        return
    }

    Write-Step '운영 스크립트 업로드'
    Invoke-Remote 'mkdir -p /app/spring-boot /app/next /app/scripts /app/manual-build'
    $scripts = Get-ChildItem -Path (Join-Path $repoRoot 'deploy\server') -Filter '*.sh' |
        ForEach-Object { $_.FullName }
    Copy-ToRemote -Sources $scripts -Destination '/app/scripts/'
    Invoke-Remote 'chmod +x /app/scripts/*.sh'
}

function Stage-Api {
    Write-Step 'API jar 업로드'
    $jar = Join-Path $apiArtifactDir 'app.jar'
    if (-not (Test-Path $jar)) {
        throw "API 산출물이 없습니다: $jar"
    }
    Invoke-Remote 'mkdir -p /app/spring-boot'
    Copy-ToRemote -Sources @($jar) -Destination '/app/spring-boot/app.jar.new'
}

function Stage-WebRemoteBuild {
    $sourceArchive = Package-WebSource

    Write-Step 'WEB 소스 업로드 및 서버 빌드'
    Invoke-Remote 'mkdir -p /app/manual-build /app/next'
    Copy-ToRemote -Sources @($sourceArchive) -Destination '/app/manual-build/web-src.tar.gz'

    $npmStep = if ($SkipNpmCi) { 'npm install' } else { 'npm ci' }
    $remoteBuild = @"
set -euo pipefail
rm -rf /app/manual-build/web-src /app/next/dist.new
mkdir -p /app/manual-build/web-src /app/next/dist.new
tar -xzf /app/manual-build/web-src.tar.gz -C /app/manual-build/web-src
cd /app/manual-build/web-src
$npmStep
npm run build
mkdir -p .next/standalone/.next/static
cp -r .next/static/. .next/standalone/.next/static/
if [ -d public ]; then
  rm -rf .next/standalone/public
  cp -r public .next/standalone/
fi
tar -czf /app/manual-build/web-dist.tar.gz -C .next/standalone .
tar -xzf /app/manual-build/web-dist.tar.gz -C /app/next/dist.new
"@
    Invoke-Remote $remoteBuild
}

function Stage-WebLocalBuild {
    if (-not $SkipBuild) {
        $archive = Build-WebLocal
    }
    else {
        $archive = Join-Path $webArtifactDir 'web-dist.tar.gz'
        if (-not (Test-Path $archive)) {
            throw "WEB 산출물이 없습니다: $archive"
        }
    }

    Write-Step 'WEB dist 업로드'
    Invoke-Remote 'rm -rf /app/next/dist.new && mkdir -p /app/next/dist.new'
    Copy-ToRemote -Sources @($archive) -Destination '/app/next/web-dist.manual.tar.gz'
    Invoke-Remote 'tar -xzf /app/next/web-dist.manual.tar.gz -C /app/next/dist.new && rm -f /app/next/web-dist.manual.tar.gz'
}

function Deploy-Web {
    Write-Step 'WEB 교체/재시작'
    Invoke-Remote 'bash /app/scripts/deploy-web.sh'
}

function Deploy-Api {
    Write-Step 'API 교체/재시작/헬스체크'
    Invoke-Remote 'bash /app/scripts/deploy-api.sh'
}

Require-Command 'ssh'
Require-Command 'scp'
Ensure-ArtifactDirs

if (-not $SkipBuild -and ($Target -eq 'both' -or $Target -eq 'api')) {
    Build-Api
}

Upload-Scripts

if ($Target -eq 'both' -or $Target -eq 'api') {
    Stage-Api
}

if ($Target -eq 'both' -or $Target -eq 'web') {
    if ($WebBuildMode -eq 'remote') {
        Stage-WebRemoteBuild
    }
    else {
        Stage-WebLocalBuild
    }
}

# Actions와 동일하게 프론트부터 교체한 뒤 API를 교체한다.
if ($Target -eq 'both' -or $Target -eq 'web') {
    Deploy-Web
}

if ($Target -eq 'both' -or $Target -eq 'api') {
    Deploy-Api
}

Write-Host ''
Write-Host '수동 배포 완료' -ForegroundColor Green
