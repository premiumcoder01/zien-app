# Implementation Plan: Server Status Banner

## Overview

Implement a global server-status banner that detects HTTP 503 responses from the Zien backend and displays an animated, non-blocking notification across all screens. The system uses a module-level event emitter to bridge TanStack React Query's cache callbacks with a React context provider, and includes automatic recovery via health-check polling and normal API traffic.

## Tasks

- [ ] 1. Set up foundation modules and health service
  - [ ] 1.1 Create the module-level event emitter (`lib/serverStatusEvents.ts`)
    - Create `lib/` directory
    - Implement `setServerStatusListener`, `emitServerStatus`, and the `isServiceUnavailable` helper
    - Export types for the event (`'unavailable' | 'recovered'`) and listener signature
    - _Requirements: 1.1, 1.2, 3.3_

  - [ ] 1.2 Create the health-check service (`services/healthService.ts`)
    - Implement `checkServerHealth()` that fetches the `/api/health` endpoint
    - Use `AbortController` with a 10-second timeout
    - Return `true` on 2xx, `false` on any failure (non-2xx, timeout, network error)
    - _Requirements: 5.1, 5.3, 5.4_

- [ ] 2. Implement the ServerStatusProvider context
  - [ ] 2.1 Create `context/ServerStatusContext.tsx` with context, provider, and hook
    - Define `ServerStatusContextType` with `isUnavailable: boolean`
    - Implement `ServerStatusProvider` that subscribes to the event emitter on mount
    - Manage `isUnavailable` state with `useState`
    - Start a 30-second `setInterval` health-check when `isUnavailable` becomes `true`; clear it when `false`
    - Fire an immediate health-check on foreground resume via `AppState` listener
    - Pause the health-check timer when app is backgrounded; resume on foreground
    - Export `useServerStatus()` hook
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write property test: 503 activates service-unavailable state (idempotent)
    - **Property 1: 503 Activates Service-Unavailable State (Idempotent)**
    - Install `fast-check` as a dev dependency and set up a test runner (Jest or Vitest)
    - Generate arbitrary sequences of HTTP status codes containing at least one 503
    - Assert final state is `active` after processing; assert no re-trigger on subsequent 503s
    - **Validates: Requirements 1.1, 1.5**

  - [ ]* 2.3 Write property test: only 2xx recovers from unavailable state
    - **Property 2: Only 2xx Responses Recover From Unavailable State**
    - Start in active state, generate non-2xx status codes, verify state stays active
    - Generate a 2xx code, verify state transitions to inactive
    - **Validates: Requirements 1.2, 1.6, 5.4**

  - [ ]* 2.4 Write property test: non-503 responses do not activate when inactive
    - **Property 3: Non-503 Responses Do Not Activate When Inactive**
    - Start in inactive state, generate arbitrary non-503 codes, verify state never becomes active
    - **Validates: Requirements 1.4**

- [ ] 3. Checkpoint - Verify core logic
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement the ServerStatusBanner component
  - [ ] 4.1 Create `components/ServerStatusBanner.tsx`
    - Read `isUnavailable` from `useServerStatus()`
    - Animate in/out with `react-native-reanimated` (`useAnimatedStyle`, `withTiming`, 300ms duration)
    - Render at the top of the screen with `position: 'absolute'`, high `zIndex`
    - Use `pointerEvents="box-none"` so touches pass through to content below
    - Display a warning icon (from `lucide-react-native`) and a static message (≤100 chars)
    - Read theme from `useAppTheme()` and apply amber background / adapted text colors
    - Account for safe area insets at the top
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.2 Write unit tests for ServerStatusBanner
    - Test banner renders when `isUnavailable` is true
    - Test banner does not render when `isUnavailable` is false
    - Test banner text is ≤100 characters
    - Test `pointerEvents="box-none"` is set
    - Test light/dark theme color adaptation
    - Test warning icon is present
    - _Requirements: 2.1, 2.2, 2.5, 4.1, 4.2, 4.4_

- [ ] 5. Wire everything into the root layout
  - [ ] 5.1 Modify `app/_layout.tsx` to configure QueryCache and MutationCache callbacks
    - Import `QueryCache`, `MutationCache` from `@tanstack/react-query`
    - Import `emitServerStatus`, `isServiceUnavailable` from `lib/serverStatusEvents`
    - Update the module-level `queryClient` to use `new QueryCache({ onError, onSuccess })` and `new MutationCache({ onError, onSuccess })`
    - In `onError`: if `isServiceUnavailable(error)` → `emitServerStatus('unavailable')`
    - In `onSuccess`: `emitServerStatus('recovered')`
    - _Requirements: 1.1, 1.2, 1.3, 3.3, 3.5_

  - [ ] 5.2 Mount `ServerStatusProvider` and `ServerStatusBanner` in the root layout
    - Wrap content inside `QueryClientProvider` with `ServerStatusProvider` (above `AppThemeProvider` or as a sibling after it)
    - Add `<ServerStatusBanner />` as a sibling to the `<Stack>` inside `InnerLayout`
    - Ensure the banner remains mounted across all route transitions
    - _Requirements: 2.6, 3.1, 3.2, 3.4_

- [ ] 6. Final checkpoint - End-to-end verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design's state machine
- Unit tests validate specific examples and edge cases
- The `lib/` directory does not yet exist and will be created in task 1.1
- No test framework is currently configured; task 2.2 includes setting up Jest or Vitest and installing `fast-check`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.2"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2"] }
  ]
}
```
