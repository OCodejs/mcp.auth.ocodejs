# OCode.js Multi-user Profiles

OCode.js profiles belong to OCode.js accounts, not GitHub accounts. The immutable Auth.js user ID is the ownership key; a unique lowercase username is the public route key at `/u/{username}`.

## Implemented in this branch

- Email/password registration creates the User and Profile in one PostgreSQL transaction.
- Auth.js OAuth `createUser` event provisions profiles for new Google/GitHub OAuth users.
- Existing users are provisioned idempotently when they open Account or call `GET /api/profile/me`.
- Profile settings are owner-only and include display name, bio, avatar, website, location, timezone, status, README text, visibility and activity visibility.
- Public profile route exposes public fields only; email and internal user ID are not included.
- Follow/unfollow, followers and following lists.
- Star/unstar repository, project, package and GitHub repository references.
- Activity events for follows and stars, with public visibility controls and cursor pagination.
- Public GitHub integration by username: public profile metadata and public repositories/events. It does not request GitHub OAuth scopes or access private repositories.

## Routes

| Method | Route | Access |
|---|---|---|
| GET | `/api/profile/me` | Authenticated owner |
| PATCH | `/api/profile/me` | Authenticated owner |
| GET | `/api/profiles/{username}` | Public |
| POST / DELETE | `/api/profiles/{username}/follow` | Authenticated |
| GET | `/api/profiles/{username}/followers` | Public |
| GET | `/api/profiles/{username}/following` | Public |
| GET | `/api/profiles/{username}/stars` | Public |
| GET | `/api/profiles/{username}/activity` | Public |
| POST / DELETE | `/api/profile/stars` | Authenticated owner |
| GET | `/api/profile/stars` | Authenticated owner |
| PATCH | `/api/profile/github` | Authenticated owner |
| GET | `/api/profiles/{username}/github` | Public |

Mutating browser endpoints require a same-origin Origin header and an Auth.js session. All profile ownership is resolved from `session.user.id`; clients cannot submit a target owner ID.

## Data model

- `Profile`: one-to-one with `User`, unique username, public fields and visibility flags.
- `ProfileLink`: ordered public external links.
- `ProfileFollow`: unique directed follower/followed pair; database check prevents self-follow.
- `ProfileStar`: unique resource type/resource ID per profile.
- `ProfileActivity`: append-only public/private activity projection.

## Database rollout

The migration at `prisma/migrations/20261108030000_add_profiles_social_graph/migration.sql` is additive. It creates new profile tables and foreign keys; it does not rewrite or delete existing User, Account, Session or VerificationToken rows.

Before applying it, provision a dedicated Preview PostgreSQL database and set its `DATABASE_URL` in the Auth.js Preview environment. Review the database target, take a backup/snapshot, and run `npx prisma migrate deploy` only against that Preview database. Do not use the Production database. A rollback should drop the newly added ProfileActivity, ProfileStar, ProfileFollow, ProfileLink and Profile tables in reverse dependency order only if no user profile data has been written; otherwise use a forward repair migration/export data first.

## GitHub integration boundary

The current integration uses GitHub's public REST endpoints and a manually configured public GitHub username. It is read-only and never stores a GitHub token. Private repository access, write scopes, GitHub App installation and contribution heatmap aggregation are intentionally not enabled in this phase.

## Release gates still required

- Configure a dedicated Preview database and run the migration there.
- Verify Auth.js Google/GitHub OAuth callbacks and email/password registration in a real Preview browser.
- Verify two separate users cannot read or mutate each other's private profile data.
- Add managed rate limiting, abuse/report/block controls, verified email policy and README Markdown sanitization before public production use.
- Verify public GitHub API rate-limit behavior and end-to-end profile/follow/star flows.
- Run CI and review the resulting checks before merging.
