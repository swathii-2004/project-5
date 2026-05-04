import os
import json
import subprocess
import glob
import re

base_dir = r"c:\Users\HP\Desktop\project-5"
frontend_apps = ["frontend-user", "frontend-vendor", "frontend-admin"]

print("Starting Cleanup...")

# Step 1 & 3: Scaffold files and api.ts
scaffold_files = [
    "src/App.css",
    "src/assets/react.svg",
    "public/vite.svg",
    "src/lib/api.ts"
]

for app in frontend_apps:
    for sf in scaffold_files:
        p = os.path.join(base_dir, app, sf)
        if os.path.exists(p):
            os.remove(p)
            print(f"Deleted {p}")

    # Replace lib/api imports
    src_dir = os.path.join(base_dir, app, "src")
    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith((".ts", ".tsx")):
                filepath = os.path.join(root, f)
                with open(filepath, "r", encoding="utf-8") as file:
                    content = file.read()
                new_content = content.replace('from "../../lib/api"', 'from "../../lib/axios"')
                new_content = new_content.replace('from "../lib/api"', 'from "../lib/axios"')
                new_content = new_content.replace("from '../../lib/api'", "from '../../lib/axios'")
                new_content = new_content.replace("from '../lib/api'", "from '../lib/axios'")
                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as file:
                        file.write(new_content)
                    print(f"Updated imports in {filepath}")

# Step 5: .env files in git
try:
    env_files = subprocess.check_output('git ls-files | findstr "\\.env$"', shell=True, cwd=base_dir, text=True).splitlines()
    for f in env_files:
        if f and not f.endswith(".env.example"):
            subprocess.run(f"git rm --cached {f}", shell=True, cwd=base_dir)
            print(f"Removed {f} from git tracking")
except subprocess.CalledProcessError:
    pass # no env files found

with open(os.path.join(base_dir, ".gitignore"), "a", encoding="utf-8") as f:
    f.write("\n# Envs\n.env\n.env.*\n!.env.example\n")

# Step 6: Package.json deps
for app in frontend_apps:
    pkg_path = os.path.join(base_dir, app, "package.json")
    if os.path.exists(pkg_path):
        with open(pkg_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        deps = data.get("dependencies", {})
        dev_deps = data.get("devDependencies", {})
        
        to_move = []
        for pkg in deps.keys():
            if pkg.startswith("@types/") or pkg in ["typescript", "vite", "eslint", "prettier"] or pkg.startswith("@vitejs/"):
                to_move.append(pkg)
                
        for pkg in to_move:
            dev_deps[pkg] = deps.pop(pkg)
            
        for pkg in list(deps.keys()):
            if pkg in dev_deps:
                del dev_deps[pkg]
                
        data["dependencies"] = deps
        data["devDependencies"] = dev_deps
        with open(pkg_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

# Step 8: index.css
tailwind_directives = "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n"
for app in frontend_apps:
    css_path = os.path.join(base_dir, app, "src", "index.css")
    if os.path.exists(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            content = f.read()
        if "@tailwind base" not in content:
            # Overwrite if it contains vite defaults like :root { ... }
            if ":root {" in content or "font-family: Inter" in content:
                with open(css_path, "w", encoding="utf-8") as f:
                    f.write(tailwind_directives)
                print(f"Overwrote {css_path} with tailwind directives")
            else:
                with open(css_path, "w", encoding="utf-8") as f:
                    f.write(tailwind_directives + "\n" + content)
                print(f"Added tailwind directives to {css_path}")

# Step 9: tailwind.config.ts
for app in frontend_apps:
    tw_path = os.path.join(base_dir, app, "tailwind.config.ts")
    if not os.path.exists(tw_path):
        tw_path = os.path.join(base_dir, app, "tailwind.config.js")
    if os.path.exists(tw_path):
        with open(tw_path, "r", encoding="utf-8") as f:
            content = f.read()
        if "content:" in content and "index.html" not in content:
            # simple regex replacement
            content = re.sub(r'content:\s*\[.*?\]', 'content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]', content, flags=re.DOTALL)
            with open(tw_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Updated content in {tw_path}")

# Step 4: Backend unused
main_py = os.path.join(base_dir, "backend", "app", "main.py")
if os.path.exists(main_py):
    with open(main_py, "r", encoding="utf-8") as f:
        main_content = f.read()
    
    routers_dir = os.path.join(base_dir, "backend", "app", "routers")
    if os.path.exists(routers_dir):
        for r_file in os.listdir(routers_dir):
            if r_file.endswith(".py") and r_file != "__init__.py":
                module_name = r_file[:-3]
                if f"app.routers.{module_name}" not in main_content and f"app.routers import {module_name}" not in main_content and f" {module_name} " not in main_content and f" {module_name}," not in main_content:
                    print(f"WARNING: Router {r_file} might not be registered in main.py")

# Checking tasks/__init__.py
tasks_init = os.path.join(base_dir, "backend", "app", "tasks", "__init__.py")
if not os.path.exists(tasks_init) and os.path.exists(os.path.dirname(tasks_init)):
    with open(tasks_init, "w", encoding="utf-8") as f:
        f.write("")
    print("Created backend/app/tasks/__init__.py")

print("Cleanup script finished.")
