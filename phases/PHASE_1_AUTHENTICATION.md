# Phase 1 — Authentication (Weeks 3–4)

> **Part of:** [LMS MVP Pacing Guide](../LMS_MVP_PACING_GUIDE.md)  
> **Dates:** Mar 16 – Mar 27, 2026  
> **Estimated hours:** 40–60 hrs (4–6 hrs/day × 10 days)  
> **Depends on:** [Phase 0](./PHASE_0_FOUNDATIONS.md) — `password` column migrated, `apiFetch` client in place

---

## Goal

Real users can register with a role, log in, receive a JWT, and stay logged in across page refreshes. Every protected
API endpoint rejects unauthenticated requests with a clear `401`. The refresh token cycle works silently so users are
never unexpectedly logged out mid-session.

> Auth is the most deceptively complex phase. Cookie/CORS interactions, secure cookie flags, and token rotation
> combine to create bugs that only appear in production environments or cross-origin setups. Front-load the debugging
> time — budget 3 days for Week 3's core endpoints, not 1.

---

## Table of Contents

1. [Week 3 — Backend Auth](#week-3--backend-auth)
2. [Week 4 — Frontend Auth](#week-4--frontend-auth)
3. [Security Architecture](#security-architecture)
4. [CORS Configuration](#cors-configuration)
5. [Where Luminescence Improves on Existing Platforms](#where-luminescence-improves-on-existing-platforms)
6. [Deliverables & Exit Criteria](#deliverables--exit-criteria)
7. [References](#references)

---

## Week 3 — Backend Auth

### Day-by-Day Breakdown

#### Monday — Password Hashing Helpers

Install bcrypt (already available via `golang.org/x/crypto` as a transitive dependency — just import it):

```bash
go get golang.org/x/crypto/bcrypt
```

Create `backend/internal/auth/password.go`:

```go
package auth

import "golang.org/x/crypto/bcrypt"

const bcryptCost = 12 // OWASP recommended minimum as of 2025

func HashPassword(plain string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
	return string(bytes), err
}

func CheckPassword(hash, plain string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain))
	return err == nil
}
```

> **Why cost 12?** At cost 12, bcrypt takes ~250ms to hash on a modern CPU. This is slow enough to make brute-force
> impractical but fast enough for a login endpoint. Cost 10 (the common default) is now considered too fast on modern
> hardware.
> Reference: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

#### Tuesday — `POST /v1/api/auth/register`

```go
// Handler: cfg.register
func (cfg *apiConfig) register(c *gin.Context) {
var params struct {
FirstName string `json:"first_name" binding:"required"`
LastName  string `json:"last_name"  binding:"required"`
Email     string `json:"email"      binding:"required,email"`
Password  string `json:"password"   binding:"required,min=8"`
Type      string `json:"type"       binding:"required,oneof=teacher student parent"`
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

hash, err := auth.HashPassword(params.Password)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "could not hash password"})
return
}

user, err := cfg.DB.CreateUser(c, database.CreateUserParams{
FirstName:   params.FirstName,
LastName:    params.LastName,
Email:       params.Email,
Password:    hash,
Type:        database.RoleType(params.Type),
AvatarColor: "#3b82f6", // default blue
})
if err != nil {
// Check for unique email violation (pq error code 23505)
c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
return
}

c.JSON(http.StatusCreated, gin.H{"user": sanitizeUser(user)}) // never return password hash
}
```

**`sanitizeUser` helper — never expose the hash:**

```go
type PublicUser struct {
ID          string `json:"id"`
FirstName   string `json:"first_name"`
LastName    string `json:"last_name"`
Email       string `json:"email"`
Type        string `json:"type"`
AvatarColor string `json:"avatar_color"`
}

func sanitizeUser(u database.User) PublicUser {
return PublicUser{
ID:          u.ID.String(),
FirstName:   u.FirstName,
LastName:    u.LastName,
Email:       u.Email,
Type:        string(u.Type),
AvatarColor: u.AvatarColor.String,
}
}
```

---

#### Wednesday — `POST /v1/api/auth/login`

Install the JWT library:

```bash
go get github.com/golang-jwt/jwt/v5
```

Create `backend/internal/auth/jwt.go`:

```go
package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Role   string    `json:"role"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(userID uuid.UUID, role, secret string) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func GenerateRefreshToken(userID uuid.UUID, role, secret string) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func ParseToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	return token.Claims.(*Claims), nil
}
```

**Login handler:**

```go
func (cfg *apiConfig) login(c *gin.Context) {
var params struct {
Email    string `json:"email"    binding:"required,email"`
Password string `json:"password" binding:"required"`
}
if err := c.ShouldBindJSON(&params); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

user, err := cfg.DB.GetUserByEmail(c, params.Email)
if err != nil || !auth.CheckPassword(user.Password.String, params.Password) {
// Return the same error for both "user not found" and "wrong password"
// — prevents email enumeration attacks
c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
return
}

jwtSecret := os.Getenv("JWT_SECRET")
accessToken, _ := auth.GenerateAccessToken(user.ID, string(user.Type), jwtSecret)
refreshToken, _ := auth.GenerateRefreshToken(user.ID, string(user.Type), jwtSecret)

// Refresh token goes in an httpOnly cookie — JS cannot read it
c.SetSameSite(http.SameSiteStrictMode)
c.SetCookie("refresh_token", refreshToken, 7*24*60*60, "/", "", true, true)

c.JSON(http.StatusOK, gin.H{
"access_token": accessToken,
"user":         sanitizeUser(user),
})
}
```

> **Why same error message for wrong email and wrong password?**  
> If you return "user not found" for invalid emails, an attacker can enumerate which emails are registered by trying
> different addresses. This is called an **email enumeration attack** and is a real threat in school systems where
> student emails are often guessable. Always return "invalid credentials" for both cases.

---

#### Thursday — `POST /v1/api/auth/refresh` & Logout

```go
func (cfg *apiConfig) refresh(c *gin.Context) {
cookie, err := c.Cookie("refresh_token")
if err != nil {
c.JSON(http.StatusUnauthorized, gin.H{"error": "no refresh token"})
return
}

claims, err := auth.ParseToken(cookie, os.Getenv("JWT_SECRET"))
if err != nil {
c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
return
}

// Issue new access token
accessToken, _ := auth.GenerateAccessToken(claims.UserID, claims.Role, os.Getenv("JWT_SECRET"))
// Rotate refresh token (optional but recommended — limits token theft window)
refreshToken, _ := auth.GenerateRefreshToken(claims.UserID, claims.Role, os.Getenv("JWT_SECRET"))

c.SetSameSite(http.SameSiteStrictMode)
c.SetCookie("refresh_token", refreshToken, 7*24*60*60, "/", "", true, true)

c.JSON(http.StatusOK, gin.H{"access_token": accessToken})
}

func (cfg *apiConfig) logout(c *gin.Context) {
// Overwrite the cookie with an expired one
c.SetCookie("refresh_token", "", -1, "/", "", true, true)
c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
```

---

#### Friday — `AuthMiddleware` & Rate Limiting

```go
// backend/internal/middleware/auth.go
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
return func (c *gin.Context) {
header := c.GetHeader("Authorization")
if header == "" || !strings.HasPrefix(header, "Bearer ") {
c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
return
}
claims, err := auth.ParseToken(strings.TrimPrefix(header, "Bearer "), jwtSecret)
if err != nil {
c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
return
}
c.Set("userID", claims.UserID)
c.Set("userRole", claims.Role)
c.Next()
}
}

// Rate limiter for the login endpoint
var loginLimiter = rate.NewLimiter(rate.Every(time.Minute), 10) // 10 req/min per process

func RateLimit() gin.HandlerFunc {
return func (c *gin.Context) {
if !loginLimiter.Allow() {
c.AbortWithStatusJSON(http.StatusTooManyRequests,
gin.H{"error": "too many login attempts, try again in a minute"})
return
}
c.Next()
}
}
```

**Wire everything in `main.go`:**

```go
// Public routes — no auth required
router.POST("/v1/api/auth/register", cfg.register)
router.POST("/v1/api/auth/login", RateLimit(), cfg.login)
router.POST("/v1/api/auth/refresh", cfg.refresh)
router.POST("/v1/api/auth/logout", cfg.logout)

// Protected routes — require valid JWT
protected := router.Group("/v1/api").Use(AuthMiddleware(os.Getenv("JWT_SECRET")))
protected.POST("/classes", cfg.createClass)
protected.GET("/classes", cfg.getClasses)
```

---

## Week 4 — Frontend Auth

### Day-by-Day Breakdown

#### Monday — Wire the Login Form

Connect `app/auth/page.tsx` to the backend:

```typescript
// On form submit
const handleLogin = async (email: string, password: string) => {
    try {
        const data = await apiFetch<{ access_token: string; user: User }>(
            '/v1/api/auth/login',
            {method: 'POST', body: JSON.stringify({email, password})}
        )
        useUserStore.getState().setUser({...data.user, accessToken: data.access_token})
        router.push('/dashboard')
    } catch (err) {
        setError('Invalid email or password')
    }
}
```

> The refresh token cookie is set by the backend automatically — the browser stores it without any JavaScript. This is
> correct by design.

---

#### Tuesday — Register Form

Add a toggle between "Sign In" and "Create Account" on `app/auth/page.tsx`. The registration form collects:

| Field      | Type     | Validation                         |
|------------|----------|------------------------------------|
| First Name | text     | required                           |
| Last Name  | text     | required                           |
| Email      | email    | required, valid email format       |
| Password   | password | required, min 8 characters         |
| Role       | select   | one of: Teacher / Student / Parent |

On success: auto-login the user using the same `handleLogin` flow.

---

#### Wednesday — Silent Token Refresh

Update `apiFetch` in `frontend/lib/api.ts` to handle 401 by attempting a refresh:

```typescript
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const result = await attemptFetch<T>(path, options)
    return result
}

async function attemptFetch<T>(
    path: string,
    options: RequestInit,
    isRetry = false
): Promise<T> {
    const token = useUserStore.getState().accessToken
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: 'include', // required for the refresh_token cookie to be sent
        headers: {
            'Content-Type': 'application/json',
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            ...options.headers,
        },
    })

    if (res.status === 401 && !isRetry) {
        // Try refreshing the token once
        const refreshRes = await fetch(`${BASE}/v1/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        })
        if (refreshRes.ok) {
            const {access_token} = await refreshRes.json()
            useUserStore.getState().setAccessToken(access_token)
            return attemptFetch<T>(path, options, true) // retry original request
        }
        // Refresh failed — session is truly expired
        useUserStore.getState().clearUser()
        throw new Error('Session expired')
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
    }

    return res.json() as Promise<T>
}
```

> **`credentials: 'include'`** is essential — without it, the browser will not send the `httpOnly` refresh_token
> cookie in cross-origin requests (localhost:3000 → localhost:8080). This is the #1 auth bug in LMS projects built with
> separate frontend/backend origins.

---

#### Thursday — Next.js Route Protection Middleware

```typescript
// frontend/middleware.ts
import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'

export function middleware(request: NextRequest) {
    const hasRefreshToken = request.cookies.has('refresh_token')
    const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isOnAuth = request.nextUrl.pathname.startsWith('/auth')

    if (isOnDashboard && !hasRefreshToken) {
        return NextResponse.redirect(new URL('/auth', request.url))
    }
    if (isOnAuth && hasRefreshToken) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/auth'],
}
```

> **Why check the cookie in middleware instead of the Zustand store?**  
> Next.js middleware runs on the server (Edge Runtime) — it has no access to `localStorage` or Zustand. The
> `refresh_token` cookie is the only auth signal available at the Edge. The access token in Zustand is verified
> per-request on the client side.

---

#### Friday — Logout & Session Persistence on Page Load

**Logout:**

```typescript
const handleLogout = async () => {
    await apiFetch('/v1/api/auth/logout', {method: 'POST'})
    useUserStore.getState().clearUser()
    useClassesStore.getState().reset() // clear cached class data
    router.push('/auth')
}
```

**Session restoration on app load** — in `app/layout.tsx` or a top-level provider:

```typescript
// Runs once on mount — if we have a refresh cookie but no access token, silently refresh
useEffect(() => {
    const token = useUserStore.getState().accessToken
    if (!token) {
        fetch(`${BASE}/v1/api/auth/refresh`, {method: 'POST', credentials: 'include'})
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.access_token) {
                    useUserStore.getState().setAccessToken(data.access_token)
                }
            })
    }
}, [])
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                  │
│                                                                 │
│  ┌──────────────────┐         ┌───────────────────────────┐    │
│  │   Zustand Store  │         │   httpOnly Cookie Store   │    │
│  │                  │         │                           │    │
│  │  access_token    │         │   refresh_token (7d)      │    │
│  │  (15 min, RAM)   │         │   (JS CANNOT READ THIS)   │    │
│  └────────┬─────────┘         └───────────────────────────┘    │
│           │                              │ sent automatically   │
└───────────┼──────────────────────────────┼─────────────────────┘
            │ Authorization: Bearer        │ Cookie header
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Gin Backend                                  │
│                                                                 │
│   AuthMiddleware           /v1/api/auth/refresh                 │
│   (validates access_token) (validates refresh_token cookie)     │
└─────────────────────────────────────────────────────────────────┘
```

**Token storage rules:**

| Token         | Storage           | Accessible to JS                 | Expiry |
|---------------|-------------------|----------------------------------|--------|
| Access token  | Zustand (RAM)     | ✅ Yes — needed to add to headers | 15 min |
| Refresh token | `httpOnly` cookie | ❌ No — XSS cannot steal it       | 7 days |

**Never do this:**

```typescript
// ❌ WRONG — XSS can steal tokens from localStorage
localStorage.setItem('access_token', token)
localStorage.setItem('refresh_token', token)
```

---

## CORS Configuration

When frontend (`:3000`) and backend (`:8080`) are on different origins, browsers block cookies by default. Install
`gin-contrib/cors`:

```bash
go get github.com/gin-contrib/cors
```

```go
// In main.go, before any routes
router.Use(cors.New(cors.Config{
AllowOrigins:     []string{"http://localhost:3000"},
AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
AllowCredentials: true, // required for cookies to be sent cross-origin
MaxAge:           12 * time.Hour,
}))
```

> **`AllowCredentials: true`** is the critical setting. Without it, `credentials: 'include'` in the frontend fetch
> does nothing — the cookie is not sent. In production, replace `AllowOrigins` with your actual domain.

---

## Where Luminescence Improves on Existing Platforms

### 1. First-Class Parent Accounts (vs. Google Classroom & Blackboard)

**The problem:**  
Google Classroom provides no parent login at all — guardians only receive automated email summaries. Blackboard's
parent access is plugin-dependent and inconsistent across institutions. Canvas gives parents an "Observer" role that
exposes too much — they can see every discussion post in every course.

**Luminescence approach:**  
Parents register with `type: 'parent'` and get a fully scoped view from day one. The `ParentGuard` middleware (added in
Phase 4) ensures they can only see data for their linked children. This is a real differentiator for K-12 schools
where parental engagement is a district-level requirement.

---

### 2. Email Enumeration Protection (vs. Most Platforms)

**The problem:**  
Most LMS platforms return different error messages for "email not found" vs. "wrong password." Canvas and Moodle are
both guilty of this. An attacker can discover which student emails are registered, which is a FERPA concern in a school
context.

**Luminescence approach:**  
The login handler always returns `"invalid credentials"` regardless of whether the email exists or the password is
wrong. This is a small implementation detail that most platforms have never retroactively fixed.

---

### 3. Stateless JWT Auth with Refresh Rotation (vs. Moodle & Blackboard)

**The problem:**  
Moodle uses session-based auth with server-side session storage. Blackboard uses session cookies. Both require sticky
sessions or shared session storage when scaled horizontally. Moodle's session handling has been a source of bugs in
load-balanced deployments.

**Luminescence approach:**  
Stateless JWT access tokens mean any server instance can validate any request without a shared session store. The
`httpOnly` refresh token cookie provides security without the drawbacks of traditional session cookies. This is the
architecture pattern used by modern SaaS platforms (Linear, Vercel, Clerk) and it scales from 1 server to 100 without
changes.

---

### 4. Silent Session Restoration (vs. Canvas & Google Classroom)

**The problem:**  
Canvas logs users out after the access token expires and forces a full re-login — disruptive during a class. Google
Classroom uses Google's OAuth session which is browser-global (signing out of Google signs you out of Classroom).

**Luminescence approach:**  
The silent refresh pattern in `apiFetch` means students and teachers are never unexpectedly logged out mid-session.
The 15-minute access token + 7-day refresh token means the UX is "always logged in" while the security properties are
"short-lived tokens."

---

### 5. Rate Limiting on Login (vs. Google Classroom)

**The problem:**  
Google Classroom delegates brute-force protection entirely to Google's infrastructure. Canvas has rate limiting but it's
configured at the institution level and often misconfigured. Most self-hosted Moodle installations have no login rate
limiting at all — Moodle relies on plugins for this.

**Luminescence approach:**  
A simple token-bucket rate limiter applied as a Gin middleware to the login endpoint. 10 attempts per minute per
process is enough to defeat automated attacks without inconveniencing legitimate users. In production this would be
upgraded to a Redis-backed per-IP limiter, but the in-process version is correct for MVP.

---

## Deliverables & Exit Criteria

Phase 1 is complete when **all** of the following are true:

- [ ] `POST /v1/api/auth/register` creates a user with a bcrypt-hashed password
- [ ] `POST /v1/api/auth/login` returns an access token and sets a `httpOnly` refresh cookie
- [ ] `POST /v1/api/auth/refresh` issues a new access token using the cookie
- [ ] `POST /v1/api/auth/logout` clears the cookie
- [ ] All `/v1/api/classes` endpoints return `401` without a valid `Authorization` header
- [ ] The frontend login form works end-to-end and redirects to `/dashboard`
- [ ] Page refresh restores the session without a re-login prompt
- [ ] `/dashboard` redirects to `/auth` if no `refresh_token` cookie is present
- [ ] `/auth` redirects to `/dashboard` if the user is already logged in
- [ ] Password hashes are never returned in any API response

---

## References

| Resource                           | URL                                                                                     |
|------------------------------------|-----------------------------------------------------------------------------------------|
| `golang-jwt/jwt` v5                | https://github.com/golang-jwt/jwt                                                       |
| `golang.org/x/crypto/bcrypt`       | https://pkg.go.dev/golang.org/x/crypto/bcrypt                                           |
| OWASP Password Storage Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html        |
| OWASP JWT Security Cheat Sheet     | https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html |
| `gin-contrib/cors`                 | https://github.com/gin-contrib/cors                                                     |
| `golang.org/x/time/rate`           | https://pkg.go.dev/golang.org/x/time/rate                                               |
| Next.js Middleware docs            | https://nextjs.org/docs/app/building-your-application/routing/middleware                |
| Next.js cookies in middleware      | https://nextjs.org/docs/app/api-reference/functions/cookies                             |
| MDN — `credentials: 'include'`     | https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials                    |
| MDN — `SameSite` cookie attribute  | https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite           |
| FERPA — student data privacy       | https://studentprivacy.ed.gov/ferpa                                                     |

---

*Phase 1 of 5 — Luminescence LMS MVP · Target completion: Mar 27, 2026*

