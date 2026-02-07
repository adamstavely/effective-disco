# Angular Refactoring Plan

## Issues Identified

### 1. DRY Violations

#### Duplicated Code:
- **Time formatting**: `getTimeAgo()` duplicated in `TaskCardComponent` and `ActivityItemComponent`
- **Panel header styles**: `.panel-header` styles duplicated across `agents-panel`, `mission-queue`, `live-feed`
- **Status labels**: Task status labels defined in `MissionQueueComponent`
- **Activity type labels**: Activity type labels defined in `LiveFeedComponent`
- **Time formatting**: `formatTime()` and `formatDate()` in `TopNavComponent`

### 2. Angular Best Practices Issues

#### Subscription Management:
- Manual subscription management instead of `async` pipe
- Manual `setInterval` cleanup instead of RxJS `timer`
- Multiple subscriptions not using `takeUntil` pattern
- Dashboard component injects service but doesn't use it

#### Change Detection:
- Missing `OnPush` change detection strategy for better performance
- Components re-render unnecessarily

#### Missing Utilities:
- No shared pipes for date/time formatting
- No shared constants for status/type mappings
- No base component for common patterns

### 3. Componentization Issues

#### Missing Shared Components:
- Panel header component (used in 3+ places)
- Filter button component (reusable pattern)
- Empty state component (for empty lists)

#### Missing Shared Styles:
- Panel header styles should be in shared stylesheet
- Common layout patterns not extracted

## Refactoring Tasks

### Priority 1: Create Shared Utilities

1. **Date/Time Pipe** (`shared/pipes/time-ago.pipe.ts`)
   - Consolidate `getTimeAgo()` logic
   - Use in templates with `async` pipe

2. **Constants Service** (`shared/constants/app.constants.ts`)
   - Task status labels
   - Activity type labels
   - Status color mappings

3. **Base Component** (`shared/components/base.component.ts`)
   - `takeUntil` pattern for subscriptions
   - Common lifecycle management

### Priority 2: Refactor Components

1. **Use Async Pipe**
   - Replace manual subscriptions with `async` pipe in templates
   - Use `combineLatest` with async pipe

2. **Add OnPush Strategy**
   - Add `changeDetection: ChangeDetectionStrategy.OnPush` to all components
   - Use `ChangeDetectorRef.markForCheck()` when needed

3. **Extract Shared Components**
   - `PanelHeaderComponent` - Reusable panel header
   - `FilterButtonComponent` - Reusable filter buttons
   - `EmptyStateComponent` - Empty list states

4. **Refactor TopNav**
   - Use RxJS `timer` instead of `setInterval`
   - Use `async` pipe for observables

### Priority 3: Extract Shared Styles

1. **Shared Stylesheet** (`styles/_shared.scss`)
   - Panel header styles
   - Common layout patterns
   - Reusable component styles

2. **Mixins** (`styles/_mixins.scss`)
   - Panel header mixin
   - Card styles mixin
   - Button styles mixin

## Implementation Order

1. Create shared utilities (pipes, constants)
2. Create shared components (panel header, etc.)
3. Refactor existing components to use shared code
4. Add OnPush change detection
5. Extract shared styles
6. Update all components to use async pipe
