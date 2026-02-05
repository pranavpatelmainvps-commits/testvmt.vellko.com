Write-Host "🔨 Building Frontend..."
Set-Location "temp_dashboard_extract_v2\app"
cmd /c "npm run build"

if ($LASTEXITCODE -eq 0) {
    Write-Host "📂 Deploying to Static folder..."
    robocopy dist ..\..\..\static /E /MIR
    Write-Host "✅ Done! Port 5000 is updated."
} 
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build Failed!"
}
Set-Location ..\..\..
