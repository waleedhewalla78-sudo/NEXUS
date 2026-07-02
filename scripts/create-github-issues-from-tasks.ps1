#Requires -Version 5.1
<#
.SYNOPSIS
  Create up to 30 priority GitHub issues from Feature 004 task definitions.
.PARAMETER DryRun
  Print actions without calling gh.
.PARAMETER UpdateTasksMd
  After create, append (#NNN) to matching lines in tasks.md.
#>
param(
  [switch]$DryRun,
  [switch]$UpdateTasksMd
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent

function Get-GhPath {
  $candidates = @(
    $(if ($cmd = Get-Command gh -ErrorAction SilentlyContinue) { $cmd.Source }),
    "$env:ProgramFiles\GitHub CLI\gh.exe",
    "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe"
  ) | Where-Object { $_ -and (Test-Path $_) }
  if (-not $candidates) { throw "GitHub CLI (gh) not found. Install from https://cli.github.com/ and run gh auth login." }
  return $candidates[0]
}

function Get-GithubRepo {
  if ($env:GITHUB_REPO) { return $env:GITHUB_REPO }
  Push-Location $RepoRoot
  try {
    $url = git config --get remote.origin.url 2>$null
    if ($url -match "github\.com[:/](.+?)(\.git)?$") { return $Matches[1] }
  } finally { Pop-Location }
  throw "Set `$env:GITHUB_REPO = 'owner/repo' (no git remote.origin.url configured)."
}

function Invoke-Gh {
  param([string[]]$GhArgs)
  & $script:GhExe @GhArgs
  if ($LASTEXITCODE -ne 0) { throw "gh failed: gh $($GhArgs -join ' ')" }
}

function Ensure-Labels {
  param([string]$Repo)
  $labels = @(
    "feature-004","feature-003","blocked","deferred","ai-cmo","launch-uat",
    "phase-a","phase-b","phase-c","phase-d","phase-e","phase-f","phase-g","phase-h",
    "sprint-13","sprint-14","sprint-15","sprint-16","sprint-17"
  )
  foreach ($l in $labels) {
    if ($DryRun) { Write-Host "[dry-run] label create $l"; continue }
    & $script:GhExe label create $l --repo $Repo --force 2>$null
  }
}

function Ensure-Milestone {
  param([string]$Repo)
  $title = "Feature 004 Implementation"
  if ($DryRun) { Write-Host "[dry-run] milestone $title"; return $title }
  $existing = & $script:GhExe milestone list --repo $Repo --json title --jq ".[] | select(.title==`"$title`") | .title" 2>$null
  if ($existing) { return $title }
  & $script:GhExe api "repos/$Repo/milestones" -f title=$title -f description="AI CMO Phase A-H implementation" | Out-Null
  return $title
}

function Test-IssueExists {
  param([string]$Repo, [string]$TaskId)
  $q = "$TaskId in:title"
  $json = & $script:GhExe issue list --repo $Repo --search $q --state all --limit 20 --json number,title 2>$null
  if (-not $json) { return $null }
  $items = $json | ConvertFrom-Json
  foreach ($i in $items) {
    if ($i.title -match "\[$([regex]::Escape($TaskId))\]" -or $i.title -match "\b$([regex]::Escape($TaskId))\b") {
      return $i.number
    }
  }
  return $null
}

function New-IssueBody {
  param($Task)
  $blocker = if ($Task.blocker) { $Task.blocker } else { "None" }
  @"
## Task ID
$($Task.id)

## Phase
$($Task.phaseName) (`$($Task.phase)`)

## User story / spec
- [spec.md](nexus-social-app/specs/004-ai-cmo-master-prd-v3/spec.md)
- [plan.md](nexus-social-app/specs/004-ai-cmo-master-prd-v3/plan.md)
- [IMPLEMENT_PLAN_ALL_OPEN.md](nexus-social-app/specs/004-ai-cmo-master-prd-v3/IMPLEMENT_PLAN_ALL_OPEN.md)

## Description
$($Task.description)

## Acceptance criteria
$($Task.acceptance)

## Verification
```bash
cd nexus-social-app
$($Task.verify)
```

## Blocker
$blocker

## Size estimate
$($Task.size)
"@
}


$GhExe = $null
if (-not $DryRun) {
  $GhExe = Get-GhPath
} else {
  if (-not $env:GITHUB_REPO) { $env:GITHUB_REPO = "OWNER/REPO" }
}
$Repo = if ($DryRun) { $env:GITHUB_REPO } else { Get-GithubRepo }
$TasksPath = Join-Path $PSScriptRoot "issue-batch\priority-30.json"
$Tasks = Get-Content $TasksPath -Raw | ConvertFrom-Json
$TasksMd = Join-Path $RepoRoot "nexus-social-app\specs\004-ai-cmo-master-prd-v3\tasks.md"

Write-Host "Repository: $Repo"
Write-Host "Gh: $GhExe"

if (-not $DryRun) {
  Ensure-Labels -Repo $Repo
  $milestone = Ensure-Milestone -Repo $Repo
} else {
  $milestone = "Feature 004 Implementation"
}

$created = @()
$skipped = @()

foreach ($task in $Tasks) {
  $existing = if ($DryRun) { $null } else { Test-IssueExists -Repo $Repo -TaskId $task.id }
  if ($existing) {
    $skipped += [pscustomobject]@{ Id = $task.id; Reason = "duplicate"; Number = $existing }
    Write-Host "SKIP $($task.id) — issue #$existing exists"
    continue
  }

  $title = "[$($task.id)] $($task.title)"
  $body = New-IssueBody -Task $task
  $labelArg = ($task.labels -join ",")

  if ($DryRun) {
    Write-Host "CREATE $title"
    $created += [pscustomobject]@{ Id = $task.id; Number = $null; Url = "(dry-run)" }
    continue
  }

  $bodyFile = Join-Path $env:TEMP "gh-issue-$($task.id).md"
  Set-Content -Path $bodyFile -Value $body -Encoding UTF8
  $url = Invoke-Gh @(
    "issue","create","--repo",$Repo,
    "--title",$title,
    "--body-file",$bodyFile,
    "--label",$labelArg,
    "--milestone",$milestone
  )
  Remove-Item $bodyFile -Force -ErrorAction SilentlyContinue
  if ($url -match "#(\d+)") {
    $num = [int]$Matches[1]
    $created += [pscustomobject]@{ Id = $task.id; Number = $num; Url = $url.Trim() }
    Write-Host "CREATED $($task.id) -> #$num"
  }
}

if ($UpdateTasksMd -and -not $DryRun -and (Test-Path $TasksMd)) {
  $content = Get-Content $TasksMd -Raw
  foreach ($c in $created | Where-Object { $_.Number }) {
    $pattern = "(\- \[[ x]\] $($c.Id)[^\n]*)"
    if ($content -match $pattern -and $content -notmatch "$($c.Id)[^\n]*\(#$($c.Number)\)") {
      $content = $content -replace $pattern, "`$1 (#$($c.Number))"
    }
  }
  Set-Content -Path $TasksMd -Value $content -Encoding UTF8 -NoNewline
  Write-Host "Updated tasks.md with issue numbers."
}

Write-Host "`n=== Summary ==="
Write-Host "Created: $($created.Count)"
$created | ForEach-Object { Write-Host "  $($_.Id) $($_.Url)" }
Write-Host "Skipped: $($skipped.Count)"
$skipped | ForEach-Object { Write-Host "  $($_.Id) — $($_.Reason) #$($_.Number)" }



