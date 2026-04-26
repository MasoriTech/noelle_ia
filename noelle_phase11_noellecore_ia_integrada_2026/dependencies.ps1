$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
& cmd.exe /c "`"$PSScriptRoot\dependencies.bat`""
