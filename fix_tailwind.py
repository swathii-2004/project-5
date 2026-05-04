import os
import re

apps = ["frontend-user", "frontend-vendor", "frontend-admin"]
base_dir = r"c:\Users\HP\Desktop\project-5"

index_css_content = """@tailwind base;
@tailwind components;
@tailwind utilities;
"""

postcss_content = """module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"""

for app in apps:
    app_dir = os.path.join(base_dir, app)
    src_dir = os.path.join(app_dir, "src")
    
    # Problem 1: index.css
    with open(os.path.join(src_dir, "index.css"), "w", encoding="utf-8") as f:
        f.write(index_css_content)
        
    # Problem 4: postcss config
    postcss_path = os.path.join(app_dir, "postcss.config.cjs")
    if not os.path.exists(postcss_path):
        with open(postcss_path, "w", encoding="utf-8") as f:
            f.write(postcss_content)
            
    # Problem 3: tailwind.config.ts
    tw_path = os.path.join(app_dir, "tailwind.config.ts")
    if os.path.exists(tw_path):
        with open(tw_path, "r", encoding="utf-8") as f:
            tw_content = f.read()
        tw_content = re.sub(r'content:\s*\[.*?\]', 'content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]', tw_content, flags=re.DOTALL)
        with open(tw_path, "w", encoding="utf-8") as f:
            f.write(tw_content)
            
    # Problem 2 & 6: main.tsx
    main_tsx_path = os.path.join(src_dir, "main.tsx")
    if os.path.exists(main_tsx_path):
        with open(main_tsx_path, "r", encoding="utf-8") as f:
            main_content = f.read()
            
        if "import './index.css'" not in main_content and 'import "./index.css"' not in main_content:
            main_content = "import './index.css'\n" + main_content
            
        if "import { Toaster } from 'sonner'" not in main_content and 'import { Toaster } from "sonner"' not in main_content:
            main_content = "import { Toaster } from 'sonner'\n" + main_content
            
        if "<Toaster" not in main_content:
            main_content = main_content.replace("<App />", '<App />\n      <Toaster position="top-right" richColors />')
            
        with open(main_tsx_path, "w", encoding="utf-8") as f:
            f.write(main_content)

print("Files updated.")
