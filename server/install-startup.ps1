$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$action = New-ScheduledTaskAction -Execute 'node.exe' -Argument "`"$dir\src\index.js`"" -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName 'WhatsApp Issue Bridge' -Action $action -Trigger $trigger -Description 'Starts the local WhatsApp Issue Bridge service' -Force
Write-Host 'Installed startup task: WhatsApp Issue Bridge'
