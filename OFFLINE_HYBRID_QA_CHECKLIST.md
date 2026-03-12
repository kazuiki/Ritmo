# Offline Hybrid QA Checklist

Use this checklist before release to validate offline-first behavior at scale.

## 1) Login And Session
- First login requires internet.
- App can reopen offline after successful login if user did not manually log out.
- Manual logout clears user-scoped local cache and requires login again.
- Deleted user on server is signed out and local user cache is cleaned.

## 2) Routine CRUD Offline/Online
- Create routine offline -> appears immediately in UI -> syncs online later.
- Update routine offline multiple times -> only latest update is synced.
- Delete routine offline -> routine remains deleted after reconnect sync.
- Routine image/preset local metadata stays visible while server payload remains sanitized.

## 3) Progress Sync And Consistency
- Mark complete offline -> progress shows immediately.
- Reconnect sync persists completion server-side.
- If remote progress is newer than queued local update, remote should win.

## 4) Onboarding Flags
- Onboarding checks are instant from local cache.
- Online refresh updates onboarding cache in background.
- Monotonic rule: stale queue cannot flip a true onboarding flag to false.
- Explicit reset flow still sets all onboarding flags to false.

## 5) Stale Data Behavior
- Cache-first render should show data instantly on tab open.
- Background refresh should update UI without blocking first paint.
- Periodic sync keeps cache fresh while online.

## 6) Queue And Retry
- Failed operations retry on reconnect.
- Queue coalescing avoids duplicate routine updates and onboarding upserts.
- Queue length and failure stats are visible in local sync metrics.

## 7) Privacy And Data Lifecycle
- User-scoped caches are deleted on manual logout.
- Notification IDs for a user are removed during user cache cleanup.
- Inactive user caches are pruned after retention window.
- Shared-device behavior is validated with multiple user logins.

## 8) Multi-User Device Scenarios
- User A data must not appear when User B logs in.
- Switch users repeatedly with intermittent internet.
- Ensure offline fallback does not load stale data from another user.

## 9) Reliability Under Poor Network
- Test with airplane mode and unstable network transitions.
- Verify no UI blocking on home/add/progress/settings initial render.
- Confirm sync resumes automatically when internet returns.

## 10) Regression Checks
- Voiceover/background audio still works after offline changes.
- Preset GIF/images render correctly offline and online.
- No crashes on app start with corrupted or missing cache files.
