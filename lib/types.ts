export type Priority = "red" | "amber" | "green";
export type Permission = "view" | "edit";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  tagline: string;
  language: string;
  workspace_label?: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  priority: Priority;
  due_date: string | null;
  completed: boolean;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  board_data: unknown;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  date: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string | null;
  monthly_limit: number;
  month: string;
  currency: string;
}

export interface PlannedCost {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  due_date: string;
  created_at: string;
}

export interface Share {
  id: string;
  shared_with: string | null;
  share_token: string;
  permission: Permission;
  created_at: string;
}

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Software",
  "Entertainment",
  "Health",
  "Travel",
  "Shopping",
  "Other",
] as const;
