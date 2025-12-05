# Script để mở port 8000 trong Windows Firewall
# Chạy với quyền Administrator

Write-Host "Đang kiểm tra và thêm firewall rule cho port 8000..." -ForegroundColor Yellow

# Kiểm tra rule đã tồn tại chưa
$existingRule = Get-NetFirewallRule -DisplayName "Python Backend Port 8000" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "Firewall rule đã tồn tại. Đang xóa rule cũ..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "Python Backend Port 8000"
}

# Thêm rule mới
New-NetFirewallRule -DisplayName "Python Backend Port 8000" `
    -Direction Inbound `
    -LocalPort 8000 `
    -Protocol TCP `
    -Action Allow `
    -Description "Allow Python FastAPI backend on port 8000"

Write-Host "✅ Đã thêm firewall rule thành công!" -ForegroundColor Green
Write-Host "Bây giờ bạn có thể test kết nối từ điện thoại." -ForegroundColor Green
Write-Host ""
Write-Host "Test: Mở trình duyệt trên điện thoại và truy cập:" -ForegroundColor Cyan
Write-Host "http://192.168.1.4:8000/health" -ForegroundColor White

