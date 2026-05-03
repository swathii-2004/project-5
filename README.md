## Prerequisites
- Python 3.12
- Node.js 20
- Docker Desktop

## Local Setup
1. Clone the repo
2. cd backend && cp .env.example .env
3. Fill in .env values:
   - Generate AES_SECRET_KEY (must be exactly 32 chars):
     python -c "import secrets; print(secrets.token_hex(16))"
   - Generate JWT_SECRET:
     python -c "import secrets; print(secrets.token_hex(32))"
   - Add Cloudinary, SendGrid credentials (see architecture doc)
4. Start MongoDB + backend:
   docker-compose up
5. Seed admin account:
   cd backend && python seed_admin.py --email admin@proximart.com --password AdminPass123
6. Start frontend-user (new terminal):
   cd frontend-user && cp .env.example .env && npm install && npm run dev
   Runs on http://localhost:5173
7. Start frontend-vendor (new terminal):
   cd frontend-vendor && cp .env.example .env && npm install && npm run dev
   Runs on http://localhost:5174
8. Start frontend-admin (new terminal):
   cd frontend-admin && cp .env.example .env && npm install && npm run dev
   
   Runs on http://localhost:5175

## GitHub Secrets Required for CI/CD
To enable automated deployments via GitHub Actions, configure the following repository secrets:
- `JWT_SECRET`: Backend JWT signing key
- `AES_SECRET_KEY`: Backend AES encryption key (32 bytes)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary integration
- `SENDGRID_API_KEY`: Sendgrid API key for notifications
- `RENDER_DEPLOY_HOOK`: The deployment webhook URL from your Render dashboard
- `VERCEL_TOKEN`: Vercel Personal Access Token
- `VERCEL_ORG_ID`: Vercel Organization ID
- `VERCEL_PROJECT_ID_USER`: Vercel Project ID for frontend-user
- `VERCEL_PROJECT_ID_VENDOR`: Vercel Project ID for frontend-vendor
- `VERCEL_PROJECT_ID_ADMIN`: Vercel Project ID for frontend-admin
