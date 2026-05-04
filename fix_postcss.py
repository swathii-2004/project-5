import os

apps = ["frontend-user", "frontend-vendor", "frontend-admin"]
base_dir = r"c:\Users\HP\Desktop\project-5"

postcss_content = """module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
"""

for app in apps:
    app_dir = os.path.join(base_dir, app)
    postcss_path = os.path.join(app_dir, "postcss.config.cjs")
    with open(postcss_path, "w", encoding="utf-8") as f:
        f.write(postcss_content)
