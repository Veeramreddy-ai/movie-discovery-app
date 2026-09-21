# 🎬 Movie Discovery App

A full-stack movie discovery application built for the **Trackzio Full-Stack Developer Intern Screening Assignment**.

The application allows users to discover, search, filter, sort, and explore movies while maintaining a persistent wishlist.

Movie data is accessed through a **Node.js + Express backend**, which acts as an abstraction layer between the React frontend and the TMDB API.

---

## 🔗 Links

### Live Application

https://movie-discovery-app-fc7n.onrender.com/

### GitHub Repository

https://github.com/Veeramreddy-ai/movie-discovery-app

---

## ✨ Features

### Movie Discovery

* Browse popular/discoverable movies
* Search movies by title
* Browse movies by genre
* Filter movie results
* Sort results
* Paginated API results with infinite scrolling in the UI
* Responsive movie grid
* Loading and skeleton states

### Movie Details

Each movie has a dedicated details page containing available information such as:

* Movie poster
* Backdrop image
* Title
* Release date
* Rating
* Runtime
* Genres
* Overview
* Additional metadata
* Wishlist action

Example route:

```text
/movie/1423191
```

### Wishlist

Users can:

* Add movies to their wishlist
* Remove movies from their wishlist
* View saved movies
* Keep wishlist data after refreshing or reopening the application

Wishlist data is persisted using SQLite.

### User Experience

The application includes:

* Loading states
* Skeleton loaders
* Empty states
* Error states
* Retry handling
* Responsive layouts
* Mobile-friendly navigation
* Handling for long movie titles
* Missing-data fallbacks
* Online/offline awareness
* Scroll restoration while navigating

---

# 🏗️ Architecture

The frontend does **not communicate directly with TMDB**.

All movie requests go through the Node.js backend.

```text
┌─────────────────────────┐
│      React Frontend     │
│       React + Vite      │
└────────────┬────────────┘
             │
             │ REST API
             ▼
┌─────────────────────────┐
│    Node.js + Express    │
│       Backend API       │
└────────────┬────────────┘
             │
       ┌─────┴──────┐
       │            │
       ▼            ▼
┌─────────────┐  ┌─────────────┐
│    TMDB     │  │   SQLite    │
│  Movie API  │  │  Wishlist   │
└─────────────┘  └─────────────┘
```

This architecture:

* Keeps the TMDB API key on the server
* Prevents the frontend from depending directly on the external API
* Provides application-specific API endpoints
* Normalizes external movie data
* Allows backend-level caching and reliability controls
* Keeps wishlist persistence separate from the external movie provider

---

# 🔄 Data Flow

### Movie Search / Discovery

```text
User interacts with search or filters
              ↓
React frontend
              ↓
Node.js / Express API
              ↓
TMDB API
              ↓
Backend normalizes response
              ↓
React receives application data
              ↓
Movie cards are rendered
```

### Wishlist

```text
User adds a movie
        ↓
React frontend
        ↓
Node.js / Express API
        ↓
SQLite
        ↓
Success response
        ↓
UI updates
```

---

# 🛠️ Tech Stack

## Frontend

* React 19
* JavaScript / JSX
* Vite
* React Router
* TanStack Query
* CSS

## Backend

* Node.js
* Express 5
* JavaScript / ES Modules
* Zod
* Helmet
* CORS
* Compression
* Express Rate Limit
* dotenv

## Database

* SQLite

## External Service

* TMDB API

## Testing

* Node.js built-in test runner
* Vitest
* React Testing Library
* Testing Library User Event
* JSDOM

---

# 📁 Project Structure

```text
movie-discovery-app/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── filters/
│   │   │   ├── layout/
│   │   │   ├── movies/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── test/
│   │   └── utils/
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── db/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── services/
│   ├── tests/
│   └── package.json
│
├── .gitignore
├── package.json
└── README.md
```

---

# 🔌 API Design

The backend exposes application-specific REST endpoints instead of exposing TMDB directly to the client.

Main endpoints include:

```text
GET    /api/movies/discover
GET    /api/movies/search
GET    /api/movies/:id

GET    /api/wishlist
POST   /api/wishlist
DELETE /api/wishlist/:movieId

GET    /api/genres
```

Example:

```text
GET /api/movies/search?q=interstellar&page=1
```

The backend validates incoming parameters and transforms external movie responses into a consistent format for the frontend.

---

# ⚡ Performance & Reliability

The application considers repeated requests, rapid filter changes, large result sets, slow external services, and API failures.

### Debounced Search

Search input is debounced before requesting movie results.

This prevents unnecessary requests while the user is typing.

### Request Cancellation

The frontend handles changing requests so that stale results do not incorrectly replace newer results.

### Client-Side Server State Management

TanStack Query is used for server-state operations such as:

* Fetching
* Caching
* Loading states
* Error states
* Refetching
* Infinite/paginated data

### Backend Caching

The backend includes caching for frequently requested movie data.

Separate cache lifetimes are supported for:

* Movie lists
* Movie details
* Genres

Expired data can also be served for a limited period when the external provider is unavailable.

### Rate Limiting

The backend includes rate limiting to help protect the API from excessive requests.

### Concurrency Control

The backend limits concurrent TMDB requests to avoid unnecessary pressure on the external service.

### Circuit Breaker

A circuit-breaker mechanism is used to improve resilience when the external movie provider repeatedly fails.

### Pagination

Movie results are requested page-by-page rather than downloading a very large dataset in a single request.

---

# 🛡️ Error Handling

The application handles several real-world failure scenarios.

### External API Failure

If TMDB is unavailable or returns an error, the backend handles the failure and the frontend displays an appropriate error state.

### Slow Requests

TMDB requests have configurable timeouts.

### Retry Handling

The backend supports configurable retry behaviour for external API requests.

### Empty Results

Searches or filters with no matching movies display an appropriate empty state.

### Missing Data

Optional movie information such as posters, descriptions, or metadata may be missing.

The frontend uses fallbacks so incomplete external data does not break the interface.

### Error Boundary

The React application includes an error boundary to prevent an unexpected component error from producing an unusable page.

---

# 💾 Wishlist Persistence

Wishlist information is stored in SQLite rather than only in frontend memory.

This allows wishlist data to persist after refreshing or reopening the application.

The wishlist repository is separated from the rest of the movie-service logic so that external TMDB data and local user data remain independent.

---

# 🔐 Environment Variables

The backend loads environment variables from:

```text
server/.env
```

The main required variable is:

```env
TMDB_API_KEY=your_tmdb_api_key
```

The application also supports optional configuration for items such as:

* `PORT`
* `CORS_ORIGIN`
* `DB_PATH`
* TMDB timeout/retry settings
* TMDB concurrency limits
* Cache TTL settings

The backend uses a default port of:

```text
4000
```

The exact defaults are defined in:

```text
server/src/config.js
```

**Never commit real API keys or secrets to GitHub.**

The repository ignores `.env` files and SQLite database files through `.gitignore`.

---

# 🚀 Getting Started

## Prerequisites

Install:

* Node.js `22.13+`
* npm
* Git
* A TMDB API key

---

## 1. Clone the Repository

```bash
git clone https://github.com/Veeramreddy-ai/movie-discovery-app.git
cd movie-discovery-app
```

---

## 2. Install Dependencies

The project uses npm workspaces for the frontend and backend.

Run:

```bash
npm install
```

---

## 3. Configure Environment Variables

Create:

```text
server/.env
```

Add:

```env
TMDB_API_KEY=your_tmdb_api_key
```

Optional configuration can be added based on the variables supported in:

```text
server/src/config.js
```

Do not commit the `.env` file.

---

## 4. Run the Application

Start both frontend and backend in development mode:

```bash
npm run dev
```

The root development script starts:

* Backend development server
* Vite frontend development server

---

# 📦 Production Build

Build the frontend:

```bash
npm run build
```

Start the backend:

```bash
npm start
```

---

# 🧪 Testing

The project includes frontend and backend automated tests.

Run the complete test suite:

```bash
npm test
```

Run only server tests:

```bash
npm run test:server
```

Run only client tests:

```bash
npm run test:client
```

The tests cover important application behaviour including movie browsing, wishlist functionality, UI behaviour, and backend logic.

---

# 🧠 Technical Decisions

## Why React?

React provides a component-based approach for building reusable movie cards, filters, search controls, navigation, loading states, and movie detail sections.

## Why Node.js + Express?

The backend provides a clear abstraction layer between the frontend and TMDB.

This allows the application to:

* Keep API credentials server-side
* Validate requests
* Normalize external data
* Handle external API failures
* Apply caching
* Apply rate limiting
* Control concurrency
* Manage retries and timeouts

## Why SQLite?

The assignment requires persistent wishlist functionality.

SQLite provides simple persistent storage without requiring additional database infrastructure for the scope of this project.

## Why TanStack Query?

Movie discovery involves significant server-state management.

TanStack Query helps handle:

* Fetching
* Caching
* Loading states
* Error states
* Refetching
* Paginated/infinite data

This keeps server-state logic separate from presentation components.

---

# 📌 Assumptions

The following assumptions were made during implementation:

1. User authentication was not required by the assignment.
2. A lightweight persistent wishlist was sufficient for the screening project.
3. Movie information remains owned by TMDB and is not unnecessarily duplicated in the local database.
4. Pagination is preferable to downloading very large result sets at once.
5. External API failures should be handled without crashing the frontend.
6. The backend is responsible for communicating with TMDB.
7. API credentials must never be exposed to the browser.

---

# ⚠️ Known Limitations

The application could be extended further for a production environment with features such as:

* User authentication
* Account-based wishlists
* Redis or distributed caching
* More advanced recommendation systems
* Advanced filtering
* CI/CD pipelines
* More extensive end-to-end testing
* Production monitoring and observability
* Persistent user preferences

These were kept outside the core scope of the screening assignment.

---

# 🤖 AI Usage

AI-assisted development tools were used as supporting tools during the development process.

They were used for activities such as:

* Exploring implementation approaches
* Understanding API and framework concepts
* Generating and refining development ideas
* Debugging issues
* Reviewing edge cases
* Improving documentation

The implementation was reviewed and adapted to the requirements of the assignment, and the submitted code was tested locally.

I am responsible for understanding the submitted implementation and being able to explain, debug, and extend it.

---

# 🔮 Future Improvements

With additional development time, I would consider:

1. User authentication and account-based wishlists
2. Redis-based distributed caching
3. More comprehensive end-to-end testing
4. CI/CD with automated testing
5. Structured logging and production observability
6. More advanced movie recommendations
7. Additional movie metadata such as cast and crew
8. Accessibility improvements and automated accessibility testing
9. Performance monitoring
10. More advanced discovery and filtering options

---

# 📄 Assignment

This project was developed as part of the:

**Trackzio – Full-Stack Developer Intern Screening Assignment**

The project focuses on demonstrating:

* Product thinking
* Frontend development
* Backend architecture
* Third-party API integration
* Data persistence
* Performance considerations
* Error handling
* Responsive design
* Maintainable code structure
* Technical decision-making

---

## 👨‍💻 Author

**Veeram Reddy**

GitHub:

https://github.com/Veeramreddy-ai

Live Application:

https://movie-discovery-app-fc7n.onrender.com/
