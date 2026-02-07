/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated `server` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev` or `npx convex codegen`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activities from "../activities";
import type * as agents from "../agents";
import type * as documents from "../documents";
import type * as messages from "../messages";
import type * as notifications from "../notifications";
import type * as schema from "../schema";
import type * as tasks from "../tasks";
import type * as thread_subscriptions from "../thread_subscriptions";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  agents: typeof agents;
  documents: typeof documents;
  messages: typeof messages;
  notifications: typeof notifications;
  schema: typeof schema;
  tasks: typeof tasks;
  thread_subscriptions: typeof thread_subscriptions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<"query" | "mutation", "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<"query" | "mutation", "internal">
>;

/* prettier-ignore-end */
