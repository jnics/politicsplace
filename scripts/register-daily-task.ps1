# Registers (or re-registers) the "PoliticsPlace daily pull" Windows scheduled
# task: runs scripts/daily-pull.mjs --publish every morning (pull, commit the
# data files, deploy) and appends its output to a dated log under
# %LOCALAPPDATA%\politicsplace\logs.
#
#   powershell -ExecutionPolicy Bypass -File scripts\register-daily-task.ps1 [-At 7:00am]
#
# Runs as the current user, only while logged on (no stored password). If
# the PC is off or asleep at the scheduled time, it runs at the next chance.
# Remove with:  Unregister-ScheduledTask -TaskName "PoliticsPlace daily pull"
param([string]$At = "7:00am")

$repo = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $env:LOCALAPPDATA "politicsplace\logs"
New-Item -ItemType Directory -Force $logDir | Out-Null

# node runs directly and writes its own dated log (--log-dir): wrapping it
# in PowerShell redirection makes 5.1 report every run as failed.
$action = New-ScheduledTaskAction -Execute $node `
  -Argument "scripts\daily-pull.mjs --publish --log-dir `"$logDir`"" `
  -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName "PoliticsPlace daily pull" -Action $action -Trigger $trigger `
  -Settings $settings -Description "politicsplace: polls, ratings, early vote, registration (scripts/daily-pull.mjs)" `
  -Force | Out-Null

Get-ScheduledTask -TaskName "PoliticsPlace daily pull" | Select-Object TaskName, State
"Logs: $logDir"
