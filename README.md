# Claire Skiin — Beauty E-commerce Platform

A full-stack beauty e-commerce application for discovering skincare, hair-care, and lip-care products, managing orders, and exploring spa services. The project combines a React and TypeScript frontend with an Express and TypeScript REST API, a PostgreSQL database, and an administrative dashboard.

> **Project status:** This project contains substantial storefront, backend, and administrative functionality. Some API integrations and payment flows still require completion before the application can be considered production-ready. The limitations and planned improvements are documented below.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Security and Best Practices](#security-and-best-practices)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)
- [What I Learned](#what-i-learned)

## Overview

Claire Skiin is a beauty retail web application designed to provide customers with an intuitive shopping experience and administrators with tools to manage store operations.

Customers can browse beauty products, explore product details, manage their shopping carts, enter delivery information, and create orders. The platform also includes hair-care and lip-care sections, spa services, customer account functionality, and an administrative workspace.

The application follows a layered full-stack architecture:

- **Frontend:** React and TypeScript for the user interface.
- **Backend:** Node.js, Express, and TypeScript for API endpoints and business logic.
- **Database:** PostgreSQL for persistent storage.
- **Authentication:** JWT-based authentication with refresh-token handling.
- **Administration:** A protected dashboard for managing products, orders, customers, coupons, and other store operations.

This project demonstrates practical application development skills, including frontend engineering, REST API design, relational database management, authentication, authorization, and business logic implementation.

## Features

### 1. Customer Shopping Experience

- Product browsing and catalog navigation.
- Dedicated skincare, hair-care, and lip-care shopping pages.
- Product detail pages containing descriptions, images, ingredients, benefits, prices, and stock information.
- Shopping cart interface with quantity management.
- Checkout interface for entering shipping details and reviewing orders.
- Order confirmation page.
- Wishlist and product review functionality represented in the application.
- Responsive UI components and reusable layouts.

### 2. User Authentication and Accounts

- User registration and login interfaces.
- Protected frontend routes.
- Backend authentication handlers.
- JWT access-token authentication.
- Refresh-token rotation and revocation support.
- Email verification handlers.
- Password-reset functionality.
- Password hashing using `bcryptjs`.

Some account-related features depend on the corresponding services, email configuration, and API routes being integrated correctly.

### 3. Administrative Dashboard

The application includes a dedicated administrative workspace with functionality for managing essential store operations.

Administrative features include:

- Dashboard statistics and activity summaries.
- Product creation and management.
- Inventory management.
- Order listing and status management.
- User management and role updates.
- Coupon administration.
- Review moderation.
- Sales and analytics views.
- Spa appointment management.
- Store settings and shipping-rate configuration.
- Image upload-related functionality.

Administrative pages use route protection, while backend administrative handlers use authentication and permission checks.

### 4. Spa and Appointment Management

The project includes a spa-services experience with service listings, booking interfaces, and appointment-management functionality.

The source also contains backend modules for appointment handling and time-slot management. However, some of these feature routes still need to be registered with the main Express server.

### 5. Shopping Assistant

The storefront includes a shopping assistant interface called **Claire — AI Stylist**.

It provides predefined responses to keyword-based prompts related to products and beauty topics.

**Implementation note:** The current chat behavior is rule-based. It does not yet use a live large language model or a trained AI model.

### 6. Product Recommendations and Analytics

The backend includes SQL-based recommendation logic for:

- Frequently purchased-together products.
- Category-based recommendations using a customer's purchase history.
- Trending products based on recorded product-view events.
- Product-view and other event tracking.
- Analytics-related event retrieval.

These features demonstrate data-driven recommendation logic, although they should not be described as machine-learning recommendations.

### 7. Order Processing and Business Rules

The order-processing code includes several important e-commerce rules:

- Server-side product-price retrieval.
- Inventory availability checks.
- Order creation using database transactions.
- Shipping-cost calculations.
- Coupon validation logic.
- Configurable tax calculations.
- Order and inventory data management.

The backend calculates important order values rather than blindly trusting prices submitted by the browser.

**Payment status note:** Creating an order does not currently guarantee that payment has been completed. The end-to-end Fapshi checkout integration still requires work.

---

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Routing | React Router |
| UI and styling | CSS, reusable UI components, utility-style classes |
| Icons | Lucide |
| Animations | Framer Motion / Motion |
| Charts | Recharts |
| HTTP requests | Axios |
| State management | React Context, reducers, and hooks |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Database access | `pg` |
| Authentication | JSON Web Tokens |
| Password security | `bcryptjs` |
| Request validation | Joi |
| API security | Helmet, CORS, rate limiting, and sanitization middleware |
| Real-time infrastructure | Socket.IO |
| Email delivery | Nodemailer / SMTP |
| Payment integration code | Fapshi |

> Note: Exact dependency versions and npm scripts should be verified against the project's root `package.json` and lockfile. Those files were not included in the source archive reviewed for this documentation.

## System Architecture

The project follows a layered architecture that separates the user interface, API communication, request handling, business logic, and persistent storage.

### Frontend Layer

The frontend contains pages, shared components, hooks, context providers, and service modules.

Its main responsibilities include:

- Rendering customer-facing pages.
- Managing application navigation.
- Handling form input and user interactions.
- Managing client-side state.
- Communicating with backend endpoints.
- Providing protected views for authenticated users and administrators.

### API Layer

The backend uses Express to expose REST API endpoints.

Routes define the available HTTP endpoints and middleware. Controllers handle incoming requests and responses, while services contain domain-specific operations.

### Business Logic Layer

Backend services handle operations such as:

- Order creation.
- Shipping calculations.
- Coupon processing.
- Appointment management.
- Notifications.
- Payment-related operations.
- Product recommendation queries.

### Database Layer

PostgreSQL stores the application's persistent data, including records associated with users, products, orders, carts, coupons, reviews, appointments, and event tracking.

### Example: Order Creation

A typical checkout journey involves the following stages:

1. The customer adds products to the shopping cart.
2. The customer proceeds to checkout and enters delivery information.
3. The frontend submits order details to the backend.
4. The backend retrieves product prices from the database.
5. Inventory availability and relevant pricing rules are checked.
6. The backend calculates the order values and creates the order within a database transaction.
7. The frontend displays the order confirmation interface after successful order creation.

The payment provider flow must be completed separately to ensure that payment initiation, provider confirmation, and final order status are handled reliably.

## Project Structure

The following is a high-level representation of the source structure.

```text
src/
├── App.tsx
├── main.tsx
├── animations/
├── components/
│   ├── admin/
│   ├── layout/
│   └── ui/
├── data/
├── hooks/
├── pages/
│   └── admin/
├── services/
├── store/
├── backend/
│   ├── server.ts
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── utils/
├── claire-styles.css
└── index.css
```

### Important Directories

| Directory | Responsibility |
|---|---|
| `components/` | Reusable UI components and application layouts |
| `components/admin/` | Administrative dashboard components |
| `pages/` | Customer-facing and administrative pages |
| `hooks/` | Reusable React hooks |
| `services/` | Frontend modules responsible for API requests |
| `store/` | Shared state management |
| `backend/config/` | Backend configuration and database connection setup |
| `backend/controllers/` | HTTP request handlers |
| `backend/database/` | Database schema and SQL migrations |
| `backend/middleware/` | Authentication, permissions, validation, and error handling |
| `backend/routes/` | API route definitions |
| `backend/services/` | Backend business logic |
| `backend/utils/` | Shared backend utilities |

## Getting Started

### Prerequisites

Before running the project, ensure you have:

- Node.js and npm installed.
- PostgreSQL installed or access to a PostgreSQL database.
- The complete project repository, including its dependency manifests and configuration files.
- Fapshi credentials if testing the payment integration.
- SMTP credentials if testing email-related functionality.

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

Replace the placeholders with your actual GitHub repository URL and project directory.

### 2. Install Dependencies

Install dependencies using the package manager and scripts defined in your repository.

For an npm-based project, the usual command is:

```bash
npm install
```

If the project uses separate package manifests for the frontend and backend, install dependencies in the appropriate directories instead.

### 3. Configure Environment Variables

Create the required environment files and configure the database connection, authentication secret, application URLs, and any services you intend to test.

Never commit real API keys, database passwords, email credentials, or JWT secrets to version control.

### 4. Configure PostgreSQL

Create a PostgreSQL database and configure the backend to connect to it.

The backend initializes the database during startup and contains schema and migration files in:

```text
src/backend/database/
```

Review the initialization scripts before running them against a database containing important data.

### 5. Start the Application

The backend entry point is:

```text
src/backend/server.ts
```

The backend defaults to port `3000`.

Use the actual development commands specified in the project's `package.json` files to start the frontend and backend. The exact npm scripts could not be verified from the source-only archive.

### 6. Verify the Backend

The backend defines a health endpoint at:

```http
GET http://localhost:3000/api/health
```

A successful response indicates that the health route is reachable. It does not, by itself, verify every database integration, API module, payment flow, or frontend feature.

---

## Environment Variables

The source references the following environment variables.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign and verify JWTs |
| `PORT` | Backend port; defaults to `3000` |
| `NODE_ENV` | Application runtime environment |
| `CORS_ORIGIN` | Allowed frontend origin or origins |
| `VITE_API_URL` | Frontend API base URL; defaults to `/api` |
| `APP_URL` | Base application URL for email verification links |
| `SHARED_APP_URL` | Frontend URL used for payment redirects |
| `SMTP_USER` | SMTP account username |
| `SMTP_APP_PASSWORD` | SMTP application password |
| `SMTP_FROM_NAME` | Email sender display name |
| `FAPSHI_BASE_URL` | Fapshi API base URL |
| `FAPSHI_API_USER` | Fapshi API user credential |
| `FAPSHI_API_KEY` | Fapshi API key |
| `FAPSHI_WEBHOOK_SECRET` | Secret used to verify payment webhooks |
| `PYTHON_AI_SERVICE_URL` | Optional inference-service integration placeholder |

Create an `.env.example` file containing placeholder values for the variables your application actually uses. Do not include real secrets.

For example:

```dotenv
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://username:password@localhost:5432/database_name

JWT_SECRET=replace_with_a_long_random_secret

CORS_ORIGIN=http://localhost:5173

VITE_API_URL=http://localhost:3000/api

APP_URL=http://localhost:5173
SHARED_APP_URL=http://localhost:5173

SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_FROM_NAME=Claire Skiin

FAPSHI_BASE_URL=
FAPSHI_API_USER=
FAPSHI_API_KEY=
FAPSHI_WEBHOOK_SECRET=

PYTHON_AI_SERVICE_URL=
```

Adjust this example to match your actual deployment and configuration. Verify whether each variable is read by the relevant frontend or backend process before using the file.

## API Documentation

The following route groups are mounted in the reviewed backend server implementation.

| Base Path | Representative Endpoints | Purpose |
|---|---|---|
| `/api/health` | `GET /` | Health check |
| `/api/auth` | `POST /register`, `POST /login`, `GET /profile`, `POST /refresh`, `POST /logout`, `POST /forgot-password`, `POST /reset-password`, `GET /verify-email` | Authentication and account management |
| `/api/products` | `GET /`, `GET /categories`, `GET /:id` | Product catalog |
| `/api/cart` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` | Cart operations |
| `/api/orders` | `GET /`, `POST /`, `GET /tax-rate`, `GET /shipping/cost` | Order management, tax, and shipping |
| `/api/admin` | Dashboard, products, orders, users, coupons, reviews, settings, and uploads | Administrative operations |
| `/api/ai` | `GET /trending`, `GET /frequently-bought/:productId`, `GET /recommendations` | Product recommendation queries |
| `/api/events` | `POST /`, `GET /analytics` | Event collection and analytics |

The precise request bodies, response schemas, validation requirements, and authorization rules should be documented alongside each endpoint as the API stabilizes.

### Routes Requiring Integration

Additional route modules exist for payment processing, appointments, notifications, wishlists, coupon validation, and customer reviews.

However, these modules are not all registered with the main Express server in the reviewed implementation. Their existence in the source code does not necessarily mean their endpoints are accessible.

Frontend-to-backend route mismatches also remain in some areas and should be resolved before relying on these features.

---

## Security and Best Practices

The codebase contains several useful security foundations:

- **Password hashing:** Uses `bcryptjs` rather than storing plain-text passwords.
- **Authentication:** Protects backend routes using JWT authentication middleware.
- **Refresh-token handling:** Stores hashed refresh tokens and supports rotation and revocation.
- **Authorization:** Uses permission-based middleware for administrative operations.
- **Request validation:** Uses Joi for validation on selected endpoints.
- **Security headers:** Uses Helmet.
- **Cross-origin access:** Configures CORS.
- **Rate limiting:** Includes rate-limiting middleware.
- **Input sanitization:** Includes XSS-related sanitization middleware.
- **Database operations:** Uses PostgreSQL and parameterized SQL in reviewed database operations.
- **Order integrity:** Retrieves product prices and checks inventory on the server rather than treating client-provided totals as authoritative.
- **Error handling:** Includes centralized error-handling and graceful shutdown logic.

These safeguards provide a foundation for further security work, but they do not constitute a completed security audit.

Production deployment should include additional testing, secure secret management, database TLS verification, monitoring, and a full review of authentication and payment workflows.

---

## Known Limitations

The following issues were identified during the source review.

### 1. Some API Routers Are Not Mounted

Several backend feature modules exist but are not registered in the main Express server.

**Improvement:** Register each intended router under a consistent API prefix and test that its endpoints are reachable.

### 2. Frontend and Backend API Paths Need Alignment

Some frontend service paths do not match the corresponding backend route definitions.

For example, the frontend cart service uses `/cart/add`, while the backend cart router defines its own `POST /api/cart` handler. The checkout frontend also requests a shipping-cost path that differs from the mounted order route.

**Improvement:** Define a single API contract and align frontend service functions with the backend routes.

### 3. Checkout and Payment Are Not Fully Integrated

The checkout currently creates an order and displays a confirmation interface after a successful order-creation request. The complete Fapshi initiation and payment-confirmation lifecycle is not yet wired into checkout.

**Improvement:** Implement payment initiation, verified payment callbacks or webhooks, transaction-status updates, failure handling, and appropriate order-state transitions.

### 4. The Shopping Assistant Is Rule-Based

The current stylist chat uses keyword matching and predefined responses.

**Improvement:** Integrate an actual AI provider or inference service if AI-generated responses are required. Add server-side credential management, input validation, error handling, and tests.

### 5. Database and Administrative Bootstrap Require Hardening

The database configuration disables certificate verification through `rejectUnauthorized: false` in the reviewed connection configuration. The database initialization code also contains a fixed-email rule that promotes a user to an administrative role.

**Improvement:** Enable proper TLS certificate verification in production and replace automatic role promotion with a secure, explicit administrator bootstrap process.

### 6. Cart State Needs a Clear Source of Truth

Browser-persisted cart state and API-backed cart functionality coexist in the codebase.

**Improvement:** Define a consistent cart ownership model and implement reliable synchronization for authenticated users.

### 7. Automated Tests and Deployment Instructions Need Expansion

The reviewed source snapshot did not contain verifiable automated test files or the repository's root build configuration.

**Improvement:** Add unit and integration tests, complete setup documentation, an environment-variable template, and deployment instructions.

---

## Future Improvements

Potential development priorities include:

- Complete the checkout and Fapshi payment integration.
- Register the missing API route modules.
- Align all frontend service paths with backend endpoints.
- Implement automated tests for authentication, authorization, orders, inventory, and payment verification.
- Improve centralized logging and production monitoring.
- Add clear API request and response schemas.
- Strengthen database security and migration procedures.
- Unify cart persistence and synchronization.
- Integrate a real AI service if required by the product roadmap.
- Improve accessibility and verify responsive layouts across devices.
- Configure a continuous integration pipeline for linting, type checking, and automated tests.

## What I Learned

This project has provided practical experience in:

- Building a multi-page application with React and TypeScript.
- Organizing frontend code into reusable components, pages, hooks, and service modules.
- Developing REST APIs with Node.js, Express, and TypeScript.
- Working with PostgreSQL and relational data.
- Implementing authentication and permission-based authorization.
- Handling shopping-cart and order-processing logic.
- Applying server-side validation and security middleware.
- Integrating external services and managing configuration through environment variables.
- Reviewing a full-stack system to identify API mismatches, incomplete integrations, and opportunities for improvement.

## Conclusion

Claire Skiin demonstrates a broad full-stack development effort, combining customer-facing commerce functionality with backend business logic and administrative tools.

The project is an ongoing engineering application rather than a claim of complete production readiness. Its current architecture provides a foundation for further integration, testing, security improvements, and deployment.

For reviewers, the codebase offers an opportunity to examine frontend development, REST API design, database interactions, authentication, business rules, and practical software-engineering trade-offs.

