# Počisti shranjene GitHub poverilnice za HTTPS (Git Credential Manager + .git-credentials).
# Zaženi v PowerShellu:  .\scripts\clear-github-credentials.ps1
# Opcijsko:  $env:GIT_EXE = "D:\pot\do\git.exe"
# Nato v mapi projekta:  git push -u origin main

$ErrorActionPreference = 'Continue'

function Resolve-GitExe {
    if ($env:GIT_EXE -and (Test-Path -LiteralPath $env:GIT_EXE)) {
        return (Resolve-Path -LiteralPath $env:GIT_EXE).Path
    }
    $cmd = Get-Command git -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        return $cmd.Source
    }
    $candidates = @(
        'D:\Program files\Git\cmd\git.exe'
        'D:\Program files\Git\bin\git.exe'
        'D:\Program Files\Git\cmd\git.exe'
        'D:\Program Files\Git\bin\git.exe'
        'D:\Git\cmd\git.exe'
        'D:\Git\bin\git.exe'
        'D:\Programs\Git\cmd\git.exe'
        'D:\devtools\Git\cmd\git.exe'
        'C:\Program Files\Git\cmd\git.exe'
        'C:\Program Files\Git\bin\git.exe'
    )
    foreach ($p in $candidates) {
        if (Test-Path -LiteralPath $p) {
            return (Resolve-Path -LiteralPath $p).Path
        }
    }
    return $null
}

Write-Host "=== Brisanje GitHub poverilnic (HTTPS) ===" -ForegroundColor Cyan

$gitExe = Resolve-GitExe
if (-not $gitExe) {
    Write-Host "Git ni najden. Nastavi pot rocno, npr.:" -ForegroundColor Yellow
    Write-Host '  $env:GIT_EXE = "D:\Git\cmd\git.exe"' -ForegroundColor Gray
    Write-Host "ali dodaj mapo s git.exe v sistemski PATH (npr. D:\Git\cmd)." -ForegroundColor Yellow
    exit 1
}
Write-Host "Uporabljam: $gitExe" -ForegroundColor Gray

# 1) git credential-manager erase
$inputErase = "protocol=https`nhost=github.com`n"
try {
    $inputErase | & $gitExe credential-manager erase 2>&1
    if ($LASTEXITCODE -ne 0) {
        $inputErase | & $gitExe credential reject 2>&1
    }
    Write-Host "[OK] Poskus erase/reject za github.com" -ForegroundColor Green
} catch {
    Write-Host "[Opozorilo] $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2) .git-credentials
$credFile = Join-Path $env:USERPROFILE '.git-credentials'
if (Test-Path $credFile) {
    $bak = "$credFile.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Move-Item -LiteralPath $credFile -Destination $bak -Force
    Write-Host "[OK] Preimenovano: $credFile -> $bak" -ForegroundColor Green
} else {
    Write-Host "[Info] Ni datoteke $credFile" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Rocno se preveri se: Nadzorna plosca -> Upravitelj poverilnic -> Web Credentials -> github.com (odstrani)." -ForegroundColor Cyan
Write-Host "Nato: git push -u origin main   (uporabi BostjanAl + PAT z obsegom repo kot geslo)" -ForegroundColor Cyan
