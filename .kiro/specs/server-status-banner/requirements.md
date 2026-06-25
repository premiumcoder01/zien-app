# Requirements Document

## Introduction

This feature introduces a global server-status banner in the Zien mobile app. When any API call returns an HTTP 503 (Service Unavailable) response, the app displays a user-friendly banner or overlay informing the user that the server is temporarily unavailable. The banner appears across all screens without requiring per-screen implementation and automatically dismisses when the server becomes reachable again.

## Glossary

- **Banner**: A non-modal visual overlay component rendered at the top or bottom of the screen, informing the user of a transient server condition.
- **API_Client**: The HTTP layer responsible for executing all network requests from the app to the Zien backend.
- **Server_Status_Provider**: A React context provider that tracks whether a 503 response has been received and exposes that state to all descendant components.
- **Query_Client**: The TanStack React Query client instance that manages caching, retries, and global query/mutation callbacks.
- **Service_Unavailable**: An HTTP 503 status code indicating the server is temporarily unable to handle the request.

## Requirements

### Requirement 1: Detect 503 Responses Globally

**User Story:** As a user, I want the app to automatically detect when the server is unavailable, so that I am informed without needing to navigate or retry manually.

#### Acceptance Criteria

1. WHEN any API request to the Zien backend receives a 503 status code, THE Server_Status_Provider SHALL set the service-unavailable state to active.
2. WHILE the service-unavailable state is active, WHEN a subsequent API request receives a successful response (2xx status code), THE Server_Status_Provider SHALL set the service-unavailable state to inactive.
3. THE API_Client SHALL intercept all incoming HTTP responses from the Zien backend before they reach individual hooks or components.
4. IF the network response contains a status code other than 503 while the service-unavailable state is inactive, THEN THE Server_Status_Provider SHALL not change state.
5. IF the service-unavailable state is already active and another 503 response is received, THEN THE Server_Status_Provider SHALL remain in the active state without re-triggering state transitions.
6. WHILE the service-unavailable state is active, IF a non-503 error response (4xx or non-503 5xx status code) is received, THEN THE Server_Status_Provider SHALL remain in the active state.

### Requirement 2: Display a Global Banner

**User Story:** As a user, I want to see a clear notification when the server is being upgraded, so that I understand why the app may not be functioning normally.

#### Acceptance Criteria

1. WHILE the service-unavailable state is active, THE Banner SHALL be visible on all screens of the app.
2. THE Banner SHALL display a static text message indicating the server is temporarily unavailable and the user should try again shortly, with a maximum length of 100 characters.
3. THE Banner SHALL be rendered at the top of the screen, visually positioned above all other screen content and navigation elements in z-order.
4. WHEN the service-unavailable state transitions from active to inactive, THE Banner SHALL be removed from the screen within 1 second.
5. THE Banner SHALL not block user interaction with the underlying screen content, allowing all touch targets beneath the banner area to remain accessible.
6. IF the app navigates to a different screen WHILE the service-unavailable state is active, THEN THE Banner SHALL remain visible without re-triggering its entrance.

### Requirement 3: Integrate at the App Root Level

**User Story:** As a developer, I want a single integration point for the server-status banner, so that every screen benefits without per-screen modifications.

#### Acceptance Criteria

1. THE Server_Status_Provider SHALL be mounted inside the QueryClientProvider and SHALL wrap all navigable screen components in the root layout file (app/_layout.tsx), so that both authenticated and unauthenticated routes are covered.
2. THE Banner component SHALL be rendered as a sibling to the root Stack navigator within the root layout, so it remains mounted and visible regardless of the currently active route.
3. THE Server_Status_Provider SHALL configure the Query_Client defaultOptions global onError callback (or equivalent MutationCache/QueryCache callback) to detect 503 responses, requiring zero modifications to individual service files, query hooks, or screen components.
4. WHEN a new screen is navigated to via any route transition, THE Banner component SHALL remain rendered without re-mounting or flickering if the service-unavailable state is active.
5. THE Server_Status_Provider SHALL not duplicate the QueryClient instance; it SHALL consume the same QueryClient instance already provided by the existing QueryClientProvider.

### Requirement 4: Banner Presentation and Styling

**User Story:** As a user, I want the server-status banner to be noticeable but not disruptive, so that I can still navigate the app while being aware of the server issue.

#### Acceptance Criteria

1. THE Banner SHALL use a distinct background color (e.g., amber/warning tone) that contrasts with the app theme.
2. THE Banner SHALL include an icon indicating a warning or maintenance state.
3. THE Banner SHALL animate in and out smoothly when the service-unavailable state changes, using a slide-down entrance and slide-up exit with a duration between 200ms and 400ms.
4. THE Banner SHALL adapt its text color and background to the current app theme (light or dark mode).

### Requirement 5: Automatic Recovery Detection

**User Story:** As a user, I want the banner to disappear automatically when the server is available again, so that I do not need to manually dismiss or restart the app.

#### Acceptance Criteria

1. WHILE the service-unavailable state is active, THE Server_Status_Provider SHALL trigger automatic health-check requests at a fixed interval between 30 and 60 seconds, and SHALL also treat any user-initiated API call that returns a successful response as a recovery signal.
2. WHEN a successful response (2xx) is received from any API call or health-check, THE Server_Status_Provider SHALL set the service-unavailable state to inactive within 1 second.
3. WHILE the service-unavailable state is active, THE Server_Status_Provider SHALL send health-check requests to a dedicated health endpoint on the Zien backend, with no more than one request per 30-second interval.
4. IF a health-check request fails (non-2xx response, network timeout after 10 seconds, or network error), THEN THE Server_Status_Provider SHALL keep the service-unavailable state active and retry at the next scheduled interval.
5. WHILE the app is in the background, THE Server_Status_Provider SHALL pause automatic health-check requests and SHALL resume them when the app returns to the foreground.
