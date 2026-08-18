# Helper to run RailForge Studio (.NET 8 C# ASP.NET Core)
$env:PATH = "$env:USERPROFILE\.dotnet;$env:PATH"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting RailForge Studio (.NET 8 C# ASP.NET Core)" -ForegroundColor Green
Write-Host " URL: http://localhost:5000" -ForegroundColor Yellow
Write-Host " Press Ctrl+C in this terminal to stop the server." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

Start-Process "http://localhost:5000"
dotnet run --project src/RailForge.Web/RailForge.Web.csproj --urls "http://localhost:5000"
