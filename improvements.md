# Implementation Backlog for Keeptrack

## High Priority

### 1. Database Indexing
- Add proper indexes for frequently queried fields (task boardId, userId, status, createdAt)
- Review MongoDB query patterns and add appropriate indexes

### 2. Performance Optimization
- Implement pagination for list endpoints that return many items
- Cache frequently accessed data (user sessions, board lists)
- Optimize realtime updates to reduce unnecessary payloads

### 3. Security Enhancements
- Rate limiting on auth endpoints
- Input validation for all API endpoints
- Security headers review and standardization

### 4. Error Handling
- Standardize error responses across all API routes
- Add better error messages for client-side debugging
- Implement retry logic for transient errors

## Medium Priority

### 1. Testing Coverage
- Add end-to-end tests for critical user flows
- Improve unit test coverage for backend utilities
- Add integration tests for database operations

### 2. Code Organization
- Refactor duplicated code in API routes
- Standardize response schemas
- Improve type safety across the codebase

### 3. Feature Completeness
- Implement the vault sync script mentioned in README
- Add board management UI (create, edit, delete boards)
- Complete the notes sync functionality

### 4. Documentation
- Update API documentation with current endpoints
- Add architectural decision records
- Document database schema and relations

## Low Priority

### 1. UX Improvements
- Accessibility audits and fixes
- Mobile-specific optimizations
- Dark mode support

### 2. Dev Experience
- Better local development setup
- Docker compose for local MongoDB
- Pre-commit hooks for linting and formatting

## Tracking

- [x] Database Indexing — done, issue #19, merged via PR #28
- [x] Performance Optimization — done, issue #20 (caching layer for `currentUser` lookups), merged via PR #29
- [x] Security Enhancements — done, issue #21 (rate limiting on OAuth token/register endpoints), merged via PR #27
- [x] Error Handling Standardization — audit found this already satisfied (consistent `{ error }` + status-code shape across routes); issue #25 closed, no code change needed
- [x] Testing Coverage Improvement — audit found this already satisfied (extensive backend unit, frontend component, and Playwright e2e coverage, see `docs/TESTING.md`); issue #26 closed, no code change needed
- [x] Code Organization Refactoring — audit found no concrete duplication or schema inconsistency worth fixing; issue #22 closed, no code change needed
- [x] Vault Sync Script Implementation — done, issue #23 (`scripts/sync-vault.mjs`), merged via PR #31
- [x] Documentation Updates — done, issue #24 (API docs, ADRs, DB schema docs), merged via PR #30
