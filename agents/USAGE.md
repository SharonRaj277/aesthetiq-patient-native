# AesthetiQ Agent System — Usage Guide

## What This Is

Five specialized Claude agents that work together to build AesthetiQ's production backend.
Paste the contents of each agent file into a Claude conversation to activate that agent's persona.

---

## How To Use Each Agent

### Method 1 — Single Agent
1. Open a new Claude conversation
2. Paste the entire contents of the agent file as your first message (as a system prompt or first user message)
3. Follow with your specific request

### Method 2 — Master Orchestrator (Recommended for full backend builds)
1. Open Claude
2. Paste `master.agent.md` contents
3. Use the command keywords below

---

## Command Reference

### Bootstrap the entire backend from scratch
```
[BOOTSTRAP]
Set up the complete AesthetiQ backend project structure using Node.js + TypeScript + Express.
Use Firebase Functions v2 for deployment.
Generate: package.json, tsconfig.json, firebase.json, .env.example, and the folder structure
from backend.agent.md. Do not write route code yet — just the skeleton.
```

### Set up Firebase Authentication middleware
```
[AUTH SETUP]
Using auth.agent.md rules, implement:
1. requireAuth middleware (Firebase JWT verification)
2. requireOwnership middleware
3. requireRole middleware
4. authRateLimit middleware
Write all TypeScript files as specified in auth.agent.md. Include setup instructions.
```

### Generate the full Firestore schema
```
[DB SCHEMA]
Using db.agent.md, produce:
1. All TypeScript interfaces for every collection
2. firestore.indexes.json with all composite indexes
3. firestore.rules with the complete security rules
4. A migration guide for moving from the current mock data to this schema
```

### Build the scan submission endpoint (end-to-end)
```
[SCAN ENDPOINT]
Build the complete scan flow:
1. POST /api/v1/scans — accepts images, validates, saves to Firestore
2. Claude Vision integration (from ai.agent.md) — face/skin/dental prompts
3. GET /api/v1/scans/:scanId — returns result
4. GET /api/v1/scans — paginated list with type filter
Apply auth middleware and ownership checks from auth.agent.md.
Use db.agent.md schema for Firestore writes.
```

### Integrate AI analysis for a specific scan type
```
[AI MODULE] scan_type=face
Generate:
1. The full system prompt for facial harmony analysis (from ai.agent.md)
2. The analyzeImages() function with proper Claude API call
3. Zod validation schema for the response
4. Response transformer: Claude JSON → ScanDocument shape
5. Cost estimate per 1000 facial scans
```

### Build appointment booking API
```
Build POST /api/v1/appointments and GET /api/v1/appointments using:
- auth.agent.md for JWT + ownership
- db.agent.md AppointmentDocument schema
- backend.agent.md route/controller/service pattern
Include: validation, error handling, doctor availability check stub
```

### Build medical reports upload endpoint
```
Build the medical reports upload flow:
- POST /api/v1/reports (multipart/form-data, file goes to Firebase Storage)
- GET /api/v1/reports (filtered by type, uploadedBy)
- GET /api/v1/reports/:id/download (returns signed URL — 15 min expiry)
Use auth.agent.md signed URL pattern. Apply scan rate limiting to upload.
```

### Generate the health profile update endpoint
```
Build PUT /api/v1/users/me/health-profile:
- Validate body against HealthProfileEmbedded schema (db.agent.md)
- Update users/{uid}.healthProfile in Firestore
- Recalculate profileCompletionScore
- Stamp updatedAt with server timestamp
Apply requireAuth + requireOwnership. Log nothing that is PHI.
```

### Check current build status
```
[STATUS]
List all backend modules and mark which are complete, in progress, or pending.
Use the status table format from master.agent.md.
```

---

## Recommended Build Order

Follow this sequence to avoid dependency issues:

```
Step 1:  [BOOTSTRAP]           → project skeleton, package.json, tsconfig
Step 2:  [AUTH SETUP]          → middleware first, everything depends on it
Step 3:  [DB SCHEMA]           → schema + indexes + rules
Step 4:  GET /api/v1/users/me  → simplest authenticated route, validates the stack
Step 5:  Health profile PUT     → write path to Firestore
Step 6:  [AI MODULE] face       → Claude integration for face scans
Step 7:  [SCAN ENDPOINT]       → full scan submission + AI pipeline
Step 8:  Appointment API        → booking flow
Step 9:  Medical reports API   → file upload + signed URLs
Step 10: Rate limiting review   → apply authRateLimit + scanRateLimit everywhere
Step 11: [STATUS]              → review what's complete
```

---

## Agent Quick Reference

| Agent | Best For | Key Output |
|-------|----------|------------|
| `master.agent.md` | Orchestrating multi-step builds | Decomposed tasks + status table |
| `backend.agent.md` | Routes, controllers, services | TypeScript Express code |
| `ai.agent.md` | Claude API, scan analysis | System prompts + API calls |
| `db.agent.md` | Firestore schema, rules, indexes | Schemas + security rules |
| `auth.agent.md` | JWT, roles, HIPAA, rate limits | Middleware + threat model |
