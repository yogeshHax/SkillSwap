# 🛠️ Skill Exchange Marketplace — Backend API

A production-ready, scalable Node.js backend for a skill-exchange marketplace platform connecting customers with local service providers.

---

## 🏗️ Architecture

```
Controller → Service → Repository → Model (MongoDB)
                  ↓
           Redis Cache
                  ↓
           Socket.io (real-time)
                  ↓
           Bull Queue (notifications)
                  ↓
           Gemini AI (recommendations)
```

---

## 📁 Project Structure

```
skill-exchange-backend/
├── src/
│   ├── app.js                    # Express app setup
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   ├── redis.js              # Redis client
│   │   └── socket.js             # Socket.io server & events
│   ├── models/
│   │   ├── user.model.js         # User (customer/provider)
│   │   ├── service.model.js      # Service listings
│   │   ├── booking.model.js      # Bookings
│   │   ├── review.model.js       # Reviews (auto-updates ratings)
│   │   └── message.model.js      # Chat messages
│   ├── repositories/             # Data access layer (DB queries)
│   ├── services/                 # Business logic layer
│   ├── controllers/              # HTTP request handlers
│   ├── routes/                   # Express route definitions
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT + RBAC
│   │   ├── error.middleware.js    # Centralised error handling
│   │   ├── rateLimiter.middleware.js  # Express rate limiting
│   │   └── validate.middleware.js # express-validator
│   ├── validators/               # Request validation rules
│   ├── jobs/
│   │   └── notification.job.js   # Bull async job queue
│   └── utils/
│       ├── jwt.utils.js
│       ├── response.utils.js     # Standardised API responses
│       ├── cache.utils.js        # Redis cache helpers
│       └── logger.js             # Winston logger
├── nginx/
│   └── nginx.conf                # Load balancer config
├── scripts/
│   └── mongo-init.js
├── server.js                     # Entry point
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB >= 6
- Redis >= 6
- Docker & Docker Compose (for containerised setup)

### Option A — Local (manual)

```bash
# 1. Clone and install
git clone <repo>
cd skill-exchange-backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, Redis, JWT secrets, Gemini API key

# 3. Start services (MongoDB + Redis must be running locally)
npm run dev
```

### Option B — Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env — set GEMINI_API_KEY

docker-compose up -d
# API available at http://localhost:5000
```

### Option C — With Nginx load balancer

```bash
docker-compose --profile lb up -d --scale api=3
# 3 API instances behind Nginx at http://localhost:80
```

---

## 🔑 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | required |
| `JWT_SECRET` | JWT signing secret | required |
| `JWT_EXPIRES_IN` | Access token TTL | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token secret | required |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `GEMINI_API_KEY` | Google Gemini API key | required for AI |
| `RATE_LIMIT_MAX` | Requests per window | `100` |
| `ALLOWED_ORIGINS` | CORS whitelist (comma-separated) | |

---

## 📡 API Reference

### Base URL: `/api`

#### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register (customer or provider) |
| POST | `/auth/login` | — | Login → returns JWT |
| POST | `/auth/refresh` | — | Refresh access token |
| POST | `/auth/logout` | ✅ | Invalidate refresh token |
| GET | `/auth/me` | ✅ | Get current user |

#### Providers
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/providers` | — | List providers (paginated) |
| GET | `/providers/:id` | — | Provider profile + services + rating stats |
| GET | `/providers/nearby` | — | Geo-search providers |
| PATCH | `/providers/profile` | Provider | Update own profile |

#### Services
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/services` | — | List/search services |
| GET | `/services/:id` | — | Single service |
| POST | `/services` | Provider | Create service |
| PUT | `/services/:id` | Provider | Update service |
| DELETE | `/services/:id` | Provider | Soft-delete service |

#### Bookings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/bookings` | Customer | Create booking |
| GET | `/bookings/user` | Customer | Customer's bookings |
| GET | `/bookings/provider` | Provider | Provider's bookings |
| PATCH | `/bookings/:id/status` | Both | Update status |

**Booking status transitions:**
- Customer: `pending → cancelled`
- Provider: `pending → confirmed/rejected`, `confirmed → in_progress`, `in_progress → completed`

#### Reviews
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/reviews` | Customer | Submit review (completed bookings only) |
| GET | `/reviews/provider/:id` | — | Provider's reviews + stats |
| POST | `/reviews/:id/reply` | Provider | Reply to review |

#### Messages
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/messages` | ✅ | Send message |
| GET | `/messages/:chatId` | ✅ | Conversation history |
| GET | `/messages/chats` | ✅ | All user chats |
| GET | `/messages/unread` | ✅ | Unread count |

#### AI
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/ai/recommend` | ✅ | Gemini-powered service recommendations |

**Request body:**
```json
{
  "requirement": "I need a plumber to fix a leaking tap",
  "budget": "under $100",
  "location": "New York",
  "category": "plumbing"
}
```

---

## 🔌 Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join_chat` | `{ chatId }` | Join chat room |
| `leave_chat` | `{ chatId }` | Leave chat room |
| `typing` | `{ chatId, receiverId }` | Typing indicator |
| `stop_typing` | `{ chatId, receiverId }` | Stop typing |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `new_message` | `{ message, chatId }` | Incoming message |
| `new_booking` | `{ bookingId, service, timeSlot }` | New booking for provider |
| `booking_update` | `{ bookingId, status, note }` | Booking status changed |
| `user_online` | `{ userId }` | User came online |
| `user_offline` | `{ userId }` | User went offline |
| `user_typing` | `{ chatId, senderId }` | Typing indicator |

**Authentication:** Pass JWT in handshake:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'Bearer <your_jwt>' }
});
```

---

## 🏗️ Scalability Features

- **Stateless API** — All state in MongoDB/Redis, no in-memory session
- **Redis caching** — Provider lists, service lists cached with TTL
- **Redis-backed rate limiting** — Shared across instances
- **Horizontal scaling** — `docker-compose up --scale api=3`
- **Nginx load balancer** — Least-connection algorithm
- **Async notification queue** — Bull/Redis, decoupled from HTTP lifecycle
- **Graceful shutdown** — SIGTERM/SIGINT handled
- **Structured logging** — Winston with daily log rotation

---

## 🔐 Security Features

- Helmet.js security headers
- bcrypt password hashing (12 rounds)
- JWT access + refresh token pattern
- Role-based access control (customer/provider/admin)
- Input validation on all endpoints
- Rate limiting (global + per-route)
- CORS whitelist
- Non-root Docker user

---

## 📊 Database Indexes

All models include strategic compound indexes for:
- Geospatial queries (`2dsphere`)
- Full-text search on services
- Paginated time-sorted queries
- Provider/customer booking lookups
- Chat message retrieval

---

## 🧪 Testing

```bash
npm test                  # Run jest with coverage
npm run test:watch        # Watch mode
```

---

## 📦 Deployment (Cloud)

### Railway / Render / Fly.io
```bash
# Set env vars in dashboard, then:
docker build -t skill-exchange-api .
docker push <registry>/skill-exchange-api
```

### Environment variables needed in production:
- `NODE_ENV=production`
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — strong random strings
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — Upstash or Redis Cloud
- `GEMINI_API_KEY`
- `ALLOWED_ORIGINS` — your frontend domain

---

## 📄 License

MIT
