# Offline To-Do App — Battleplan

## 1. Project Context

### 1.1 What We Are Building

A minimalist offline-only Android To-Do app for personal use. The app manages **actions** (tasks) organized into optional lists (**Perso** and **Pro**), with local persistence via SQLite and optional local notifications for reminders.

### 1.2 Core Principles

- **Offline-first**: No network calls, no remote sync, no authentication.
- **Single source of truth**: SQLite database on device.
- **Minimalist UX**: Dark mode only, no animations, no empty-state messages, no onboarding.
- **Fast**: Must handle 10,000+ tasks without lag.
- **Deterministic**: No randomness, no server dependency, fully local.

### 1.3 Target Platform

| Property            | Value                                  |
| ------------------- | -------------------------------------- |
| Framework           | Expo SDK 54 (managed workflow)         |
| Language            | TypeScript (strict)                    |
| UI                  | React Native                           |
| Database            | expo-sqlite                            |
| Notifications       | expo-notifications                     |
| Target OS           | Android 16 (API 36)                    |
| Theme               | Dark mode only                         |
| Language (UI)       | English only                           |

---

## 2. Data Model

### 2.1 Action (Task)

An **action** represents a to-do item. It has:

| Field              | Type               | Required | Description                                                                 |
| ------------------ | ------------------ | -------- | --------------------------------------------------------------------------- |
| `id`               | `INTEGER` (PK, AI) | Yes      | Auto-increment primary key                                                  |
| `title`            | `TEXT`              | Yes      | Task title, no max length                                                   |
| `list`             | `TEXT` or `NULL`    | No       | `'perso'`, `'pro'`, or `NULL` (global only)                                |
| `sortIndex`        | `INTEGER`           | Yes      | Per-list sort position (gap-based, see §2.4)                               |
| `isDone`           | `INTEGER`           | Yes      | `0` = active, `1` = completed (soft delete)                                |
| `createdAt`        | `INTEGER`           | Yes      | Unix timestamp (ms) of creation                                            |
| `updatedAt`        | `INTEGER`           | Yes      | Unix timestamp (ms) of last update                                         |
| `reminderType`     | `TEXT`              | Yes      | One of: `'none'`, `'once'`, `'daily'`, `'weekly'`, `'monthly'`             |
| `reminderDate`     | `INTEGER` or `NULL` | No       | Unix timestamp (ms) — used for `once` type                                 |
| `reminderTime`     | `TEXT` or `NULL`    | No       | `HH:mm` 24h format — used for `daily`, `weekly`, `monthly`                |
| `reminderWeekday`  | `INTEGER` or `NULL` | No       | 1=Monday … 7=Sunday (ISO 8601) — used for `weekly`                        |
| `reminderMonthday` | `INTEGER` or `NULL` | No       | 1–31 — used for `monthly`                                                  |

### 2.2 Settings

| Field   | Type   | Description                    |
| ------- | ------ | ------------------------------ |
| `key`   | `TEXT` (PK) | Setting identifier          |
| `value` | `TEXT`      | Setting value (stringified) |

**Default settings on first launch:**

| Key                    | Default Value | Description                                  |
| ---------------------- | ------------- | -------------------------------------------- |
| `perso_reminder_time`  | `"08:00"`     | Daily list reminder time for Perso           |
| `pro_reminder_time`    | `"13:00"`     | Daily list reminder time for Pro             |

### 2.3 Notification Metadata

| Field            | Type        | Description                          |
| ---------------- | ----------- | ------------------------------------ |
| `key`            | `TEXT` (PK) | Identifier (e.g., `action_42`)       |
| `notificationId` | `TEXT`      | expo-notifications scheduled ID      |

Used to cancel/reschedule notifications when actions are edited, completed, or deleted.

### 2.4 Sort Index Strategy (Gap-Based)

Sort indexes are **per-list** (where list is `NULL`, `'perso'`, or `'pro'`).

- **Global list** (`list IS NULL`): New actions get `sortIndex = MIN(sortIndex) - 1000` (newest first).
- **Perso / Pro lists**: New actions get `sortIndex = MAX(sortIndex) + 1000` (newest last).
- **Reorder**: When moving item between positions A and B, new `sortIndex = floor((A + B) / 2)`.
- **Rebalance**: If gap between two adjacent items is < 2, rebalance the entire list with gaps of 1000.

This avoids rewriting every row on each reorder operation.

---

## 3. Reminder System

### 3.1 Two Independent Systems

#### A. List-Level Reminders (Always Active)

These are **two persistent daily notifications**, one per list:

| List  | Default Time | Content Example                       |
| ----- | ------------ | ------------------------------------- |
| Perso | 08:00        | "Perso: 5 tasks remaining"            |
| Pro   | 13:00        | "Pro: 3 tasks remaining"              |

- Scheduled as **daily repeating** notifications via `expo-notifications`.
- Times are configurable from the Settings screen.
- When the user changes the time, cancel the old notification and schedule a new one.
- The notification body dynamically shows the count of active (non-completed) tasks in that list.

#### B. Action-Level Reminders (Optional, Per Task)

Each action can optionally have one reminder:

| Type      | Trigger                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `none`    | No notification                                                         |
| `once`    | Fires at a specific date + time (must be in the future; block past)     |
| `daily`   | Fires every day at a specific time (`HH:mm`)                           |
| `weekly`  | Fires every week on a specific weekday at a specific time               |
| `monthly` | Fires every month on a specific day-of-month at a specific time         |

- When an action is **completed** (swipe right) or **deleted** (swipe left), its notification must be **cancelled**.
- When an action's reminder is **edited**, cancel the old notification and schedule the new one.
- For `once`: Validate that the selected date/time is strictly in the future; disable/block past dates in the date picker.

### 3.2 Notification Permission

Request notification permission on first app launch. If denied, reminders silently fail (no blocking UX, no error messages — the app is for personal use and the user will accept).

---

## 4. Navigation Architecture

```
BottomTabNavigator
├── Elements (screen)
├── Lists (screen with TopTabNavigator)
│   ├── Perso (tab)
│   └── Pro (tab)
└── Settings (screen)
```

- **Bottom tabs**: `Elements` | `Lists` | `Settings`
- **Top tabs** (inside Lists): `Perso` | `Pro`
- Navigation library: `@react-navigation/native` + `@react-navigation/bottom-tabs` + `@react-navigation/material-top-tabs`
- **Add Action screen**: Full-screen page (stack navigator, pushed on top)
- **Edit Action screen**: Full-screen page (stack navigator, pushed on top, same layout as Add but pre-filled)

Full navigator structure:

```
RootStackNavigator
├── MainBottomTabs
│   ├── ElementsScreen
│   ├── ListsScreen (TopTabs: Perso | Pro)
│   └── SettingsScreen
├── AddActionScreen
└── EditActionScreen
```

---

## 5. Screens — Detailed Behavior

### 5.1 Elements Screen

**Purpose**: Shows ALL active (non-completed) tasks, regardless of list assignment.

**Layout**:
- Top: Screen title "Elements"
- Body: Flat list of action cards, ordered by `sortIndex` (lowest first = newest on top for global)
- Bottom-right: FAB (Floating Action Button) with `+` icon to add a new action

**Action Card** displays:
- Title
- List badge (small colored label: "Perso" / "Pro" / nothing)
- Reminder icon if a reminder is set (any type other than `none`)

**Interactions**:
- **Tap card** → Navigate to Edit Action screen
- **Swipe right** → Mark as complete (`isDone = 1`), card disappears, cancel any reminder
- **Swipe left** → Delete confirmation dialog → Hard delete from DB, cancel any reminder
- **Long-press + drag** → Reorder (drag-and-drop)
- **FAB tap** → Navigate to Add Action screen (no list pre-selected)

### 5.2 Lists Screen — Perso Tab

**Purpose**: Shows active tasks where `list = 'perso'`, ordered by `sortIndex` (lowest first = oldest on top).

**Layout & interactions**: Same as Elements screen, except:
- Filtered to `list = 'perso'` only
- FAB tap → Navigate to Add Action screen with list pre-selected to `'perso'`
- No list badge shown (redundant since you're already in the Perso tab)

### 5.3 Lists Screen — Pro Tab

Same as Perso tab but filtered to `list = 'pro'` and FAB pre-selects `'pro'`.

### 5.4 Add Action Screen

**Purpose**: Create a new action.

**Fields** (top to bottom):
1. **Title** — Text input, required, auto-focused
2. **List** — Segmented control or dropdown: `None` | `Perso` | `Pro` (pre-selected if navigated from a list tab)
3. **Reminder Type** — Segmented control: `None` | `Once` | `Daily` | `Weekly` | `Monthly`
4. **Reminder Configuration** (shown conditionally based on type):
   - `once`: Date picker (DD/MM/YYYY) + Time picker (HH:mm). Block past dates.
   - `daily`: Time picker (HH:mm)
   - `weekly`: Weekday picker (Mon–Sun) + Time picker (HH:mm)
   - `monthly`: Day-of-month picker (1–31) + Time picker (HH:mm)
5. **Save button** — Validates, inserts into DB, schedules notification if needed, navigates back

**Sort index on create**:
- If `list` is `NULL`: `sortIndex = MIN(sortIndex for list IS NULL) - 1000` (or `0` if first)
- If `list` is `'perso'` or `'pro'`: `sortIndex = MAX(sortIndex for that list) + 1000` (or `0` if first)

### 5.5 Edit Action Screen

**Purpose**: Edit an existing action.

Same layout as Add Action, but:
- All fields are pre-filled with current values
- Title: "Edit Action"
- Save button updates the row and reschedules notification if reminder changed
- Changing the `list` field moves the action between lists (assign new `sortIndex` at the end of the target list)

### 5.6 Settings Screen

**Purpose**: Configure list-level reminders and export data.

**Sections**:

1. **Perso Reminder Time** — Time picker, default `08:00`. On change: cancel old daily notification, schedule new one.
2. **Pro Reminder Time** — Time picker, default `13:00`. On change: cancel old daily notification, schedule new one.
3. **Export Data** — Two buttons:
   - "Export as CSV" → Generates CSV of all active (non-completed) actions, opens share sheet
   - "Export as JSON" → Generates JSON of all active (non-completed) actions, opens share sheet

**Export format** (both CSV and JSON include these fields):
`id`, `title`, `list`, `sortIndex`, `createdAt`, `updatedAt`, `reminderType`, `reminderDate`, `reminderTime`, `reminderWeekday`, `reminderMonthday`

---

## 6. UX Details

| Aspect                 | Decision                                                    |
| ---------------------- | ----------------------------------------------------------- |
| Theme                  | Dark mode only (dark background, light text)                |
| Animations             | None required                                               |
| Empty states           | Blank screen, no message                                    |
| Swipe right            | Complete task (soft delete, `isDone = 1`)                   |
| Swipe left             | Delete task (confirmation dialog → hard delete)             |
| Undo complete          | Not supported                                               |
| Reorder                | Drag-and-drop (long-press to initiate)                      |
| Add button             | FAB (floating action button), bottom-right corner           |
| Add/Edit screens       | Full-screen pushed pages                                    |
| Confirmation on delete | Yes — simple "Delete this action?" dialog                   |
| Confirmation on complete | No — instant                                              |

---

## 7. Repository Structure

```
/
├── app.json
├── App.tsx
├── tsconfig.json
├── package.json
├── battleplan.md
├── offline_todo_app_spec.md
├── src/
│   ├── types/
│   │   ├── Action.ts          # Action type/interface + ReminderType enum
│   │   └── Settings.ts        # Settings type/interface
│   ├── db/
│   │   ├── database.ts        # SQLite connection singleton + initialization
│   │   └── migrations.ts      # Table creation SQL + default settings insert
│   ├── repos/
│   │   ├── actionRepo.ts      # CRUD + query functions for actions table
│   │   ├── settingsRepo.ts    # CRUD for settings table
│   │   └── notificationMetaRepo.ts  # CRUD for notification_meta table
│   ├── services/
│   │   ├── sortService.ts     # Sort index computation + rebalancing logic
│   │   ├── reminderService.ts # Schedule/cancel action-level notifications
│   │   ├── listReminderService.ts   # Schedule/cancel list-level daily notifications
│   │   └── exportService.ts   # Generate CSV/JSON + trigger share sheet
│   ├── screens/
│   │   ├── ElementsScreen.tsx
│   │   ├── ListsScreen.tsx    # Container with top tabs
│   │   ├── PersoTab.tsx
│   │   ├── ProTab.tsx
│   │   ├── AddActionScreen.tsx
│   │   ├── EditActionScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── ActionCard.tsx     # Single action row (title, badge, reminder icon)
│   │   ├── ActionList.tsx     # Reusable drag-and-drop swipeable list
│   │   ├── FAB.tsx            # Floating action button
│   │   ├── ReminderForm.tsx   # Reminder type selector + conditional fields
│   │   ├── ListPicker.tsx     # Segmented control for None/Perso/Pro
│   │   └── TimePicker.tsx     # Reusable time picker wrapper
│   └── navigation/
│       ├── RootNavigator.tsx  # Stack: MainTabs + Add/Edit screens
│       ├── MainTabs.tsx       # Bottom tab navigator
│       └── ListsTabs.tsx      # Top tab navigator (Perso | Pro)
```

---

## 8. Dependencies

| Package                                      | Purpose                              |
| -------------------------------------------- | ------------------------------------ |
| `expo` (~54)                                 | Framework                            |
| `expo-sqlite`                                | Local SQLite database                |
| `expo-notifications`                         | Local push notifications             |
| `expo-sharing`                               | Share sheet for export                |
| `expo-file-system`                           | Write export files to temp directory |
| `@react-navigation/native`                  | Navigation core                      |
| `@react-navigation/bottom-tabs`             | Bottom tab navigator                 |
| `@react-navigation/material-top-tabs`       | Top tab navigator (Lists)            |
| `@react-navigation/native-stack`            | Stack navigator (Add/Edit screens)   |
| `react-native-screens`                      | Native screen optimization           |
| `react-native-safe-area-context`            | Safe area handling                   |
| `react-native-gesture-handler`              | Swipe gestures                       |
| `react-native-reanimated`                   | Required by gesture handler / drag   |
| `react-native-draggable-flatlist`           | Drag-and-drop reordering             |
| `react-native-swipeable-item`               | Swipe-to-complete / swipe-to-delete  |
| `@react-native-community/datetimepicker`    | Native date/time pickers             |
| `react-native-pager-view`                   | Required by material-top-tabs        |

---

## 9. Task List

> Each task is designed to be implementable independently by an LLM, in order.
> Every task specifies exactly what files to create/modify and the expected outcome.

---

### Task 1 — Project Initialization & Architecture

**Goal**: Set up the Expo project, install all dependencies, create the folder structure, and configure TypeScript.

**Steps**:
1. Create a new Expo project with TypeScript template:
   ```
   npx create-expo-app@latest . --template blank-typescript
   ```
   (Run inside the project root directory. If files exist, may need `--yes` flag or clear directory first.)
2. Install all dependencies listed in §8 above:
   ```
   npx expo install expo-sqlite expo-notifications expo-sharing expo-file-system @react-navigation/native @react-navigation/bottom-tabs @react-navigation/material-top-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated react-native-draggable-flatlist react-native-swipeable-item @react-native-community/datetimepicker react-native-pager-view
   ```
3. Create the folder structure under `src/` as defined in §7:
   - `src/types/`
   - `src/db/`
   - `src/repos/`
   - `src/services/`
   - `src/screens/`
   - `src/components/`
   - `src/navigation/`
4. Configure `app.json`:
   - Set `"name"` and `"slug"` to `"todo-app"`
   - Set `"android.package"` to `"com.soper.todoapp"`
   - Set `"android.compileSdkVersion"` to `36`
   - Set `"android.targetSdkVersion"` to `36`
   - Add notification permissions
   - Set `"userInterfaceStyle"` to `"dark"`
5. Ensure `tsconfig.json` has strict mode enabled and path aliases if desired.

**Outcome**: Project builds and runs on Android with `npx expo start`. Empty screen, no errors.

---

### Task 2 — Type Definitions

**Goal**: Define all TypeScript types and enums used across the app.

**Files to create**:

**`src/types/Action.ts`**:
- `ReminderType` enum: `None = 'none'`, `Once = 'once'`, `Daily = 'daily'`, `Weekly = 'weekly'`, `Monthly = 'monthly'`
- `ActionList` enum: `Perso = 'perso'`, `Pro = 'pro'`
- `Action` interface matching the DB schema (§2.1), with proper TypeScript types:
  - `id: number`
  - `title: string`
  - `list: ActionList | null`
  - `sortIndex: number`
  - `isDone: boolean` (mapped from 0/1 integer in DB)
  - `createdAt: number`
  - `updatedAt: number`
  - `reminderType: ReminderType`
  - `reminderDate: number | null`
  - `reminderTime: string | null`
  - `reminderWeekday: number | null`
  - `reminderMonthday: number | null`

**`src/types/Settings.ts`**:
- `SettingsKey` enum: `PersoReminderTime = 'perso_reminder_time'`, `ProReminderTime = 'pro_reminder_time'`
- `Settings` interface: `{ key: SettingsKey; value: string }`

**Outcome**: Types importable from `src/types/`, no compile errors.

---

### Task 3 — Database Setup & Initialization

**Goal**: Create the SQLite database connection, run table creation, and seed default settings.

**Files to create**:

**`src/db/migrations.ts`**:
- Export a `runMigrations(db)` function that executes:
  ```sql
  CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    list TEXT,
    sortIndex INTEGER NOT NULL,
    isDone INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    reminderType TEXT NOT NULL DEFAULT 'none',
    reminderDate INTEGER,
    reminderTime TEXT,
    reminderWeekday INTEGER,
    reminderMonthday INTEGER
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notification_meta (
    key TEXT PRIMARY KEY,
    notificationId TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_actions_list ON actions(list);
  CREATE INDEX IF NOT EXISTS idx_actions_isDone ON actions(isDone);
  CREATE INDEX IF NOT EXISTS idx_actions_sortIndex ON actions(sortIndex);
  ```
- Seed default settings (`perso_reminder_time` = `'08:00'`, `pro_reminder_time` = `'13:00'`) using `INSERT OR IGNORE`.

**`src/db/database.ts`**:
- Use `expo-sqlite` async API (`SQLite.openDatabaseAsync`).
- Export a `getDatabase()` function that returns the singleton DB instance.
- Export an `initDatabase()` function that opens the DB and runs migrations.
- Call WAL mode for performance: `PRAGMA journal_mode = WAL`.

**Outcome**: On app launch, calling `initDatabase()` creates the DB file with all tables and default settings. Verifiable by querying the `settings` table.

---

### Task 4 — Data Repositories

**Goal**: Create the data access layer — all CRUD operations for each table.

**Files to create**:

**`src/repos/actionRepo.ts`**:
- `getAllActive()`: `SELECT * FROM actions WHERE isDone = 0 ORDER BY sortIndex ASC`
- `getActiveByList(list: string)`: `SELECT * FROM actions WHERE isDone = 0 AND list = ? ORDER BY sortIndex ASC`
- `getById(id: number)`: `SELECT * FROM actions WHERE id = ?`
- `getActiveCountByList(list: string)`: `SELECT COUNT(*) FROM actions WHERE isDone = 0 AND list = ?`
- `getMinSortIndex(list: string | null)`: Returns min sortIndex for a given list filter (for global list prepend)
- `getMaxSortIndex(list: string | null)`: Returns max sortIndex for a given list filter (for sub-list append)
- `insert(action: Omit<Action, 'id'>)`: Insert and return the new ID
- `update(action: Action)`: Update all fields, set `updatedAt` to now
- `markDone(id: number)`: `UPDATE actions SET isDone = 1, updatedAt = ? WHERE id = ?`
- `deleteById(id: number)`: `DELETE FROM actions WHERE id = ?`
- `updateSortIndex(id: number, sortIndex: number)`: Update only sortIndex
- `rebalanceSortIndexes(list: string | null)`: Reassign sortIndexes with gap of 1000 for all active items in the given list

All functions must map DB integer booleans to TypeScript booleans.

**`src/repos/settingsRepo.ts`**:
- `get(key: string)`: Returns value or null
- `set(key: string, value: string)`: `INSERT OR REPLACE`
- `getAll()`: Returns all settings as key-value pairs

**`src/repos/notificationMetaRepo.ts`**:
- `get(key: string)`: Returns notificationId or null
- `set(key: string, notificationId: string)`: `INSERT OR REPLACE`
- `deleteByKey(key: string)`: Delete row
- `deleteByPrefix(prefix: string)`: Delete all rows where key starts with prefix

**Outcome**: All DB operations available as clean async functions. No UI yet.

---

### Task 5 — Sort Service

**Goal**: Centralize sort index computation logic.

**File to create**: **`src/services/sortService.ts`**

Functions:
- `computeSortIndexForNewAction(list: string | null)`: 
  - If `list` is `null`: return `MIN(sortIndex) - 1000` (or `0` if no items)
  - If `list` is `'perso'` or `'pro'`: return `MAX(sortIndex) + 1000` (or `0` if no items)
- `computeSortIndexBetween(before: number, after: number)`:
  - Return `Math.floor((before + after) / 2)`
  - If gap < 2, trigger rebalance
- `rebalanceList(list: string | null)`:
  - Fetch all active actions for the list ordered by current sortIndex
  - Reassign sortIndexes as `0, 1000, 2000, 3000, ...`
  - Batch update in a transaction

**Outcome**: Reordering and insertion always produce valid, well-spaced sort indexes.

---

### Task 6 — Navigation Setup

**Goal**: Set up the full navigation structure with placeholder screens.

**Files to create**:

**`src/navigation/RootNavigator.tsx`**:
- `NativeStackNavigator` with screens:
  - `Main` → `MainTabs` (no header)
  - `AddAction` → `AddActionScreen` (header: "New Action")
  - `EditAction` → `EditActionScreen` (header: "Edit Action", receives `actionId` param)
- Dark theme applied to navigation container (`DarkTheme` from `@react-navigation/native`)

**`src/navigation/MainTabs.tsx`**:
- `BottomTabNavigator` with tabs:
  - `Elements` → `ElementsScreen`
  - `Lists` → `ListsScreen`
  - `Settings` → `SettingsScreen`
- Dark-themed tab bar with appropriate icons

**`src/navigation/ListsTabs.tsx`**:
- `MaterialTopTabNavigator` with tabs:
  - `Perso` → `PersoTab`
  - `Pro` → `ProTab`
- Dark-themed top tab bar

**All screens**: Create placeholder screens (just a `<View>` with screen name `<Text>`) in `src/screens/`:
- `ElementsScreen.tsx`
- `ListsScreen.tsx`
- `PersoTab.tsx`
- `ProTab.tsx`
- `AddActionScreen.tsx`
- `EditActionScreen.tsx`
- `SettingsScreen.tsx`

**Update `App.tsx`**:
- Wrap app in `GestureHandlerRootView`
- Call `initDatabase()` on mount (with loading state)
- Render `RootNavigator` once DB is ready

**Outcome**: App displays bottom tabs (Elements, Lists, Settings). Lists tab shows top tabs (Perso, Pro). All navigation works. FAB not yet present.

---

### Task 7 — Reusable Components

**Goal**: Build all shared UI components before screens.

**Files to create**:

**`src/components/ActionCard.tsx`**:
- Props: `action: Action`, `onPress: () => void`
- Displays:
  - Title text (white on dark)
  - List badge: small colored pill — blue for "Perso", green for "Pro", hidden if `null`
  - Reminder icon (bell icon) if `reminderType !== 'none'`
- Entire card is a touchable → calls `onPress`

**`src/components/ActionList.tsx`**:
- Props: `actions: Action[]`, `onReorder: (fromIndex, toIndex) => void`, `onComplete: (id) => void`, `onDelete: (id) => void`, `onPress: (id) => void`
- Uses `react-native-draggable-flatlist` for drag-and-drop
- Uses `react-native-swipeable-item`:
  - Swipe right: green background with checkmark → calls `onComplete`
  - Swipe left: red background with trash icon → shows confirmation alert → calls `onDelete`
- Renders `ActionCard` for each item

**`src/components/FAB.tsx`**:
- Props: `onPress: () => void`
- Absolute positioned at bottom-right
- Round button with `+` icon
- Dark-themed (e.g., white icon on accent-colored circle)

**`src/components/ListPicker.tsx`**:
- Props: `value: ActionList | null`, `onChange: (value) => void`
- Three-option segmented control: `None` | `Perso` | `Pro`

**`src/components/ReminderForm.tsx`**:
- Props: `reminderType`, `reminderDate`, `reminderTime`, `reminderWeekday`, `reminderMonthday`, `onChange: (fields) => void`
- Top row: segmented control for reminder type
- Conditional fields below:
  - `once`: date picker + time picker (block past dates)
  - `daily`: time picker
  - `weekly`: weekday selector (Mon–Sun buttons) + time picker
  - `monthly`: day-of-month number input (1–31) + time picker
- Uses `@react-native-community/datetimepicker`

**`src/components/TimePicker.tsx`**:
- Wrapper around `@react-native-community/datetimepicker` in time mode
- Props: `value: string` (HH:mm), `onChange: (value: string) => void`
- Displays current time as a touchable label; opens native picker on tap

**Outcome**: All components render correctly in isolation. No data-fetching logic in components.

---

### Task 8 — Elements Screen (Full Implementation)

**Goal**: Fully implement the Elements screen with data-fetching, FAB, swipe, and reorder.

**File to modify**: **`src/screens/ElementsScreen.tsx`**

**Implementation**:
1. On mount / focus: fetch all active actions via `actionRepo.getAllActive()`
2. Render `ActionList` with swipe and drag-and-drop
3. Render `FAB` — on press: navigate to `AddAction` screen (no list param)
4. **Swipe right (complete)**:
   - Call `actionRepo.markDone(id)`
   - Cancel any scheduled notification for this action (via `reminderService`)
   - Remove from local state
5. **Swipe left (delete)**:
   - Show `Alert.alert("Delete this action?", ...)` confirmation
   - On confirm: call `actionRepo.deleteById(id)`, cancel notification, remove from local state
6. **Drag-and-drop reorder**:
   - On drop: compute new `sortIndex` via `sortService.computeSortIndexBetween()`
   - Call `actionRepo.updateSortIndex()`
   - Update local state
7. **Tap card**: Navigate to `EditAction` screen with `actionId` param

**Outcome**: Elements screen displays all tasks, supports swipe-complete, swipe-delete, drag-reorder, and navigates to add/edit.

---

### Task 9 — Add Action Screen

**Goal**: Implement the full action creation form.

**File to modify**: **`src/screens/AddActionScreen.tsx`**

**Implementation**:
1. Receive optional `list` param from navigation (pre-selected when coming from a list tab)
2. Form state:
   - `title: string` (empty, auto-focused)
   - `list: ActionList | null` (from param or null)
   - `reminderType: ReminderType` (default `none`)
   - `reminderDate`, `reminderTime`, `reminderWeekday`, `reminderMonthday` (all null)
3. Render: title input → `ListPicker` → `ReminderForm`
4. Save button:
   - Validate: title must not be empty
   - Compute `sortIndex` via `sortService.computeSortIndexForNewAction(list)`
   - Insert via `actionRepo.insert()`
   - If reminder type is not `none`, schedule notification via `reminderService`
   - Navigate back
5. For `once` reminder: Validate date is in the future, show error if not

**Outcome**: User can create an action with title, optional list, and optional reminder. Returns to previous screen.

---

### Task 10 — Edit Action Screen

**Goal**: Implement the action editing form.

**File to modify**: **`src/screens/EditActionScreen.tsx`**

**Implementation**:
1. Receive `actionId` param from navigation
2. On mount: fetch action via `actionRepo.getById(actionId)`, populate form
3. Same form layout as Add Action, pre-filled with existing values
4. Save button:
   - Update via `actionRepo.update()`
   - If list changed: compute new `sortIndex` at end of target list
   - If reminder changed: cancel old notification, schedule new one via `reminderService`
   - Navigate back
5. Title: "Edit Action"

**Outcome**: User can edit all fields of an existing action. Changes persist.

---

### Task 11 — Perso & Pro Tabs (Lists Screen)

**Goal**: Implement the two list-filtered tabs.

**Files to modify**: **`src/screens/PersoTab.tsx`**, **`src/screens/ProTab.tsx`**, **`src/screens/ListsScreen.tsx`**

**Implementation for each tab** (PersoTab / ProTab):
1. On mount / focus: fetch actions via `actionRepo.getActiveByList('perso')` (or `'pro'`)
2. Same `ActionList` component with swipe and reorder (identical logic to Elements screen)
3. `FAB` → Navigate to `AddAction` with `list` param set to `'perso'` (or `'pro'`)
4. `ActionCard`: No list badge (already obvious from context)
5. All swipe/reorder/delete logic same as Elements screen

**`ListsScreen.tsx`**: Container that renders `ListsTabs` top tab navigator.

**Outcome**: Perso and Pro tabs show filtered, reorderable tasks with add functionality.

---

### Task 12 — Reminder Service (Action-Level)

**Goal**: Implement the service that schedules/cancels action-level notifications.

**File to create**: **`src/services/reminderService.ts`**

**Functions**:
- `scheduleActionReminder(action: Action): Promise<void>`:
  - Based on `action.reminderType`, schedule via `expo-notifications`:
    - `once`: `trigger: { type: 'date', date: reminderDate }`
    - `daily`: `trigger: { type: 'daily', hour, minute }`
    - `weekly`: `trigger: { type: 'weekly', weekday, hour, minute }`
    - `monthly`: `trigger: { type: 'calendar', month: undefined, day: reminderMonthday, hour, minute, repeats: true }` (check expo-notifications API for exact format)
  - Notification content: `{ title: 'Reminder', body: action.title }`
  - Store the notification ID in `notification_meta` with key `action_{id}`
- `cancelActionReminder(actionId: number): Promise<void>`:
  - Look up notification ID from `notification_meta` where key = `action_{actionId}`
  - Cancel via `Notifications.cancelScheduledNotificationAsync(notificationId)`
  - Delete the `notification_meta` row
- `rescheduleActionReminder(action: Action): Promise<void>`:
  - Cancel existing, then schedule new

**Request permissions** on first use: `Notifications.requestPermissionsAsync()`

**Outcome**: Action-level notifications are created, cancelled, and rescheduled correctly.

---

### Task 13 — List-Level Reminder Service

**Goal**: Implement the always-on daily reminders per list.

**File to create**: **`src/services/listReminderService.ts`**

**Functions**:
- `scheduleListReminder(list: 'perso' | 'pro', time: string): Promise<void>`:
  - Parse `time` (HH:mm) into hour and minute
  - Schedule a daily repeating notification:
    - Title: `list === 'perso' ? 'Perso' : 'Pro'`
    - Body: dynamically computed is not possible (notification is pre-scheduled), so use a static body or use `expo-notifications` content handler
    - **Alternative approach**: Schedule next-day notification only. Use `expo-task-manager` or re-schedule on app open.
  - **Recommended approach**: Since expo-notifications cannot dynamically compute body at trigger time, schedule the notification **each time the app is opened** (cancel previous, count tasks, schedule for today or tomorrow at the configured time with accurate count).
  - Store notification IDs in `notification_meta` with keys `list_perso` and `list_pro`
- `cancelListReminder(list: 'perso' | 'pro'): Promise<void>`:
  - Cancel via stored notification ID
- `refreshListReminders(): Promise<void>`:
  - Called on every app launch and after any action is created/completed/deleted
  - For each list:
    1. Cancel existing notification
    2. Count active tasks: `actionRepo.getActiveCountByList(list)`
    3. Determine next trigger time (today if not yet past, otherwise tomorrow)
    4. Schedule with body: `"${count} tasks remaining"`
    5. Store notification ID

**Call `refreshListReminders()` from**:
- `App.tsx` on mount (after DB init)
- After every create, complete, or delete operation

**Outcome**: User receives daily notifications at configured times showing task count per list.

---

### Task 14 — Settings Screen

**Goal**: Implement the settings UI.

**File to modify**: **`src/screens/SettingsScreen.tsx`**

**Implementation**:
1. On mount: read `perso_reminder_time` and `pro_reminder_time` from `settingsRepo`
2. **Perso Reminder Time**: Label + `TimePicker` component. On change:
   - Save to `settingsRepo.set('perso_reminder_time', newValue)`
   - Call `listReminderService.cancelListReminder('perso')` then reschedule
3. **Pro Reminder Time**: Same pattern for `'pro'`
4. **Export section**: Two buttons
   - "Export as CSV" → calls `exportService.exportCSV()`
   - "Export as JSON" → calls `exportService.exportJSON()`

**Styling**: Dark background, section headers, consistent spacing.

**Outcome**: User can change reminder times and export data.

---

### Task 15 — Export Service

**Goal**: Generate CSV/JSON files from active actions and open the share sheet.

**File to create**: **`src/services/exportService.ts`**

**Functions**:
- `exportCSV(): Promise<void>`:
  - Fetch all active actions via `actionRepo.getAllActive()`
  - Build CSV string with headers: `id,title,list,sortIndex,createdAt,updatedAt,reminderType,reminderDate,reminderTime,reminderWeekday,reminderMonthday`
  - Write to temp file via `expo-file-system`: `FileSystem.documentDirectory + 'actions_export.csv'`
  - Open share sheet via `expo-sharing`: `Sharing.shareAsync(fileUri)`
- `exportJSON(): Promise<void>`:
  - Same data, serialized as a JSON array
  - Write to `actions_export.json`
  - Open share sheet

**Outcome**: User taps export → share sheet opens with the file ready to save/send.

---

### Task 16 — Dark Theme & Styling Polish

**Goal**: Apply consistent dark theme across all screens and components.

**Implementation**:
1. Create **`src/theme.ts`** with constants:
   - `colors.background`: `#121212`
   - `colors.surface`: `#1E1E1E`
   - `colors.primary`: `#BB86FC` (or similar accent)
   - `colors.text`: `#FFFFFF`
   - `colors.textSecondary`: `#B0B0B0`
   - `colors.perso`: `#4FC3F7` (blue badge)
   - `colors.pro`: `#81C784` (green badge)
   - `colors.danger`: `#CF6679` (delete)
   - `colors.success`: `#81C784` (complete swipe)
   - `colors.fab`: `#BB86FC`
2. Apply these colors to:
   - Navigation (already dark via `DarkTheme`, but customize tab bar colors)
   - All screen backgrounds
   - Action cards
   - FAB
   - Swipe backgrounds (green for complete, red for delete)
   - Form inputs (dark bg, white text, accent borders)
   - Settings screen
3. Ensure text is legible, touch targets are ≥ 48dp, consistent padding/margins.

**Outcome**: App looks polished and consistent in dark mode.

---

### Task 17 — Integration Testing & Bug Fixes

**Goal**: End-to-end manual testing of all flows.

**Test checklist**:
1. **First launch**: DB creates tables + default settings
2. **Add action** (global): Appears at top of Elements list
3. **Add action** (from Perso tab): Appears at bottom of Perso list, also visible in Elements
4. **Add action** (from Pro tab): Appears at bottom of Pro list, also visible in Elements
5. **Edit action**: All fields update correctly, list change moves the action
6. **Swipe right** (complete): Card disappears, no undo
7. **Swipe left** (delete): Confirmation → card removed from DB
8. **Drag-and-drop**: Reorder persists after navigating away and back
9. **Reminders** — action-level:
   - Set a `once` reminder 1 min in future → notification fires
   - Set a `daily` reminder → notification shows up next day
   - Complete/delete an action with reminder → notification cancelled
10. **Reminders** — list-level:
    - Open app → list reminders rescheduled
    - Change time in settings → next notification at new time
11. **Export CSV**: Opens share sheet with valid CSV
12. **Export JSON**: Opens share sheet with valid JSON
13. **Performance**: Add 100+ tasks, verify no lag in scrolling/reordering
14. **Edge cases**:
    - Empty lists (no crash, blank screen)
    - Very long titles (no overflow)
    - `once` reminder with past date → blocked by UI

**Outcome**: All features work correctly, no crashes.

---

## 10. Summary

| # | Task                                | New Files                               | Key Dependencies |
|---|-------------------------------------|-----------------------------------------|------------------|
| 1 | Project Init & Architecture         | `App.tsx`, folder structure, config     | —                |
| 2 | Type Definitions                    | `src/types/*`                           | —                |
| 3 | Database Setup                      | `src/db/*`                              | Task 2           |
| 4 | Data Repositories                   | `src/repos/*`                           | Tasks 2, 3       |
| 5 | Sort Service                        | `src/services/sortService.ts`           | Task 4           |
| 6 | Navigation Setup                    | `src/navigation/*`, placeholder screens | Task 3           |
| 7 | Reusable Components                 | `src/components/*`                      | Task 2           |
| 8 | Elements Screen                     | Modify `ElementsScreen.tsx`             | Tasks 4–7        |
| 9 | Add Action Screen                   | Modify `AddActionScreen.tsx`            | Tasks 4–7        |
| 10 | Edit Action Screen                 | Modify `EditActionScreen.tsx`           | Tasks 4–7, 9     |
| 11 | Perso & Pro Tabs                   | Modify tab screens                      | Tasks 4–7        |
| 12 | Action Reminder Service            | `src/services/reminderService.ts`       | Task 4           |
| 13 | List-Level Reminder Service        | `src/services/listReminderService.ts`   | Task 4           |
| 14 | Settings Screen                    | Modify `SettingsScreen.tsx`             | Tasks 13, 15     |
| 15 | Export Service                     | `src/services/exportService.ts`         | Task 4           |
| 16 | Dark Theme & Polish                | `src/theme.ts`, style updates           | All screens      |
| 17 | Integration Testing & Bug Fixes    | —                                       | All              |
