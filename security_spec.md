# Security Specification: UserScript Library Database

## 1. Data Invariants
- A `script` document must always have non-empty `name`, `code`, `id`, `version`, and timestamps.
- Global reads (list and get) are allowed for any user, as the platform is a shareable script directory.
- Writes (create, update, delete) are strictly validated for type-correctness, length boundaries, and strict schema properties (no extra keys) to prevent resource limits exhaustion.

## 2. The "Dirty Dozen" Malicious Payloads (to be rejected)
1. **Empty Name Creation**: Creating a script with a blank or empty `name`.
2. **Missing Code Field**: Creating a script without the `code` attribute.
3. **Payload Bloat**: Injecting a massive string (over 50,000 characters) in the description or other fields.
4. **Extra Keys / Shadow injection**: Creating a script with fields that don't belong (e.g. `isVerified: true` or `attackerClaim: "pwned"`).
5. **Invalid ID Format**: Creating a script with a document ID containing invalid characters (e.g., special characters like `$`, `%`, `<`).
6. **Negative Timestamps**: Specifying timestamps in invalid formats or numerical/negative types.
7. **Invalid Tags Type**: Supplying tags as a raw string instead of a valid Array of strings.
8. **Malicious version format**: Version string that is excessively long or formatted with code.
9. **Zero-length script code**: Specifying empty or null script code payload.
10. **Shadow update fields**: Trying to modify immutable fields like `createdAt` or `id` during update.
11. **Type Spoofing**: Supplying a boolean for the `description` instead of a string.
12. **Versions block array abuse**: Writing an excessively large nested versions array or missing elements schema.

## 3. Test Runner & Verification
Below is a verification checklist to ensure permission-denied blocks are working:
- Reject any WRITE request where type check fails.
- Reject any WRITE where properties count is invalid.
- Reject any update changing immutable metadata fields.
