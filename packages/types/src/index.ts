/**
 * Domain enums, matching apps/google-sheets/src/00_Constants.gs
 * LOOKUP_LISTS — single source of truth for these value sets, shared by
 * mock data, packages/ui components, and (later) the API client and
 * backend DTOs. Full entity shapes (Task, Project, Goal, Habit) land here
 * as each Phase actually needs them (Tasks: Phase 12, Projects: Phase 13,
 * ...) rather than being modeled speculatively ahead of time.
 */
export type Area = 'Career' | 'Learning' | 'Health' | 'Personal' | 'Personal Admin';
export type Priority = 'Critical' | 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Inbox' | 'To Do' | 'In Progress' | 'Waiting' | 'Completed';
export type Risk = 'Low' | 'Medium' | 'High' | 'Critical';
