# Minor Tweaks Phase Log

This file tracks all modifications made during the minor tweaks phase, including the exact change made and the reason behind it.

## Changes Log

*No changes made yet.*

- **Added "Keep me logged in" checkbox to Login Form (`frontend/src/features/auth/ui/AuthForm.tsx` & `backend/accounts/views.py`)**
  - **Change:** Added a checkbox to the UI during login, modified `LoginPayload` in `types.ts` to accept `remember_me`, and updated the Django `login_view` to set `request.session.set_expiry(0)` if the user leaves the box unchecked.
  - **Reason:** Users were defaulting to a persistent login session. The default behavior is now to log the user out when the browser closes unless they explicitly opt into a persistent session.

