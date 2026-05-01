$apps = @("frontend-user", "frontend-vendor", "frontend-admin")
Set-Location "c:\Users\HP\Desktop\project-5"

foreach ($app in $apps) {
    Remove-Item -Path $app -Recurse -Force -ErrorAction SilentlyContinue
    
    npm create vite@latest $app -- --template react-ts
    
    Set-Location "c:\Users\HP\Desktop\project-5\$app"
    
    npm install
    npm install axios zustand @tanstack/react-query react-router-dom
    npm install react-hook-form zod @hookform/resolvers
    npm install lucide-react date-fns
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    npx shadcn@latest init -d
    
    Set-Location "c:\Users\HP\Desktop\project-5"
}
