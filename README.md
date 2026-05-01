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
