$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
& cmd.exe /c "`"$PSScriptRoot\build_windows.bat`""
