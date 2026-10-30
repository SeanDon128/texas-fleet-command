param([switch]$Apply, [switch]$IncludeFrontend, [switch]$IncludeFunctions)
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    & node --input-type=module -e "import {assertTarget} from './tools/fabric.mjs'; await assertTarget(); console.log('Verified Trucks Rayfin / demodinoeast2 / East US 2.');"
    if ($LASTEXITCODE -ne 0) { throw 'Target verification failed; no deployment attempted.' }
    $target = Get-Content -Raw 'config\fabric-target.json' | ConvertFrom-Json
    $registry = Get-Content -Raw 'rayfin\.deployments.json' | ConvertFrom-Json
    $deployment = $registry.deployments.($registry.active)
    if ($deployment.fabricItemId -ne $target.appId -or
        $deployment.fabricWorkspaceId -ne $target.workspaceId -or
        $deployment.fabricTenantId -ne $target.tenantId) {
        throw 'Recorded deployment does not match the approved existing app; refusing to create or retarget an item.'
    }
    $token = az account get-access-token --resource https://api.fabric.microsoft.com --tenant $target.tenantId --query accessToken --output tsv
    if ($LASTEXITCODE -ne 0 -or -not $token) { throw 'Unable to acquire approved tenant token.' }
    $env:RAYFIN_TOKEN = $token.Trim()
    $cli = Join-Path (Get-Location) 'node_modules\.bin\rayfin.cmd'
    $excluded = @()
    if (-not $IncludeFrontend) { $excluded += 'staticHosting' }
    if (-not $IncludeFunctions) { $excluded += 'functions' }
    $arguments = @('up', '--workspace-id', $target.workspaceId, '--tenant', $target.tenantId, '--json')
    if ($excluded.Count -gt 0) { $arguments += @('--exclude-services', ($excluded -join ',')) }
    & $cli @arguments --dry-run
    if ($LASTEXITCODE -ne 0) { throw 'Rayfin preview failed; no deployment attempted.' }
    if ($Apply) {
        & $cli @arguments
        if ($LASTEXITCODE -ne 0) { throw 'Rayfin deployment failed. Inspect recorded state before retrying.' }
    }
}
finally {
    Remove-Item Env:\RAYFIN_TOKEN -ErrorAction SilentlyContinue
    Pop-Location
}
