import os

apps = ['frontend-user', 'frontend-vendor', 'frontend-admin']
base_dir = r'c:\Users\HP\Desktop\project-5'

for app in apps:
    app_dir = os.path.join(base_dir, app)
    src_dir = os.path.join(app_dir, 'src')
    
    lib_dir = os.path.join(src_dir, 'lib')
    os.makedirs(lib_dir, exist_ok=True)
    with open(os.path.join(lib_dir, 'api.ts'), 'w', encoding='utf-8') as f:
        f.write('export { default } from "./axios";\n')
        
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content.replace('from "../../lib/api"', 'from "../../lib/axios"')
                new_content = new_content.replace("from '../../lib/api'", "from '../../lib/axios'")
                new_content = new_content.replace('from "../lib/api"', 'from "../lib/axios"')
                new_content = new_content.replace("from '../lib/api'", "from '../lib/axios'")
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
