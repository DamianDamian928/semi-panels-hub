# Source Policy

All application data reads must use files, folders, or locations registered in the Sources screen.

Rules:

- The API is the guard for source access.
- A source name such as `Mass Production` means the source registered in Sources, not any similarly named file found elsewhere.
- Code must not search broad folders or alternate locations to find replacement source files.
- If a required source is missing, ambiguous, not ready, or has no registered local path, the API must return an explicit error.
- Using any unregistered location requires explicit user approval first.
- Source-driven application data, including Dashboard rows, must be read live from the registered Source file. SQLite may store app state, but it must not be used as the source of truth for file-derived rows.
