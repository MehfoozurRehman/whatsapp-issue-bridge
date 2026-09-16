$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$action = New-ScheduledTaskAction -Execute 'node.exe' -Argument "`"$dir\src\index.js`"" -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -AtLogOn
try {
  Register-ScheduledTask -TaskName 'WhatsApp Issue Bridge' -Action $action -Trigger $trigger -Description 'Starts the local WhatsApp Issue Bridge service' -Force -ErrorAction Stop
  Write-Host 'Installed scheduled startup task: WhatsApp Issue Bridge'
} catch {
  $startup = [Environment]::GetFolderPath('Startup')
  Copy-Item (Join-Path $dir 'start-bridge.cmd') (Join-Path $startup 'WhatsApp Issue Bridge.cmd') -Force
  Write-Host "Installed user Startup fallback: $startup"
}
