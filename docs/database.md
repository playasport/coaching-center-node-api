# Database Guidelines

## MongoDB via Mongoose

- Store all database connection logic in `src/config/database.ts` using Mongoose.
- Define data models under `src/models` with explicit TypeScript interfaces and `HydratedDocument` types.
- Enumerate default roles in `DefaultRoles` (super_admin, admin, user) and reference those constants when assigning user roles.
- Connection strings come from the `MONGO_URI` environment variable; do not hardcode credentials.
- Always exclude sensitive fields (like `password`) in model `toJSON` / `toObject` transforms or query projections before returning API responses.
- Each service in `src/services` should wrap Mongoose calls and expose plain objects without passwords.
- Use UUID strings for the `id` field on documents to match existing API payloads; `_id` remains internal to MongoDB.
- When adding new models, remember to document validation requirements in the corresponding Zod schema under `src/validations`.


