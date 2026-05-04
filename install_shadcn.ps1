python fix_tailwind.py

$apps = @("frontend-user", "frontend-vendor", "frontend-admin")

foreach ($app in $apps) {
    Write-Host "Processing $app..."
    Set-Location -Path "c:\Users\HP\Desktop\project-5\$app"
    
    if (!(Test-Path "src\components\ui\button.tsx")) {
        Write-Host "Installing shadcn in $app..."
        npx shadcn-ui@latest init --yes
        npx shadcn-ui@latest add button input label card badge --yes
        npx shadcn-ui@latest add dialog sheet select switch tabs --yes
        npx shadcn-ui@latest add alert-dialog popover toast separator --yes
    }
}

Set-Location -Path "c:\Users\HP\Desktop\project-5"
git add .
git commit -m "fix(frontend): fix Tailwind CSS, shadcn/ui, and toast setup"
git push origin main
