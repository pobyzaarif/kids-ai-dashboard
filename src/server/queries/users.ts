import { query } from "@/server/db";

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "suspended";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email],
  );
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  password_hash: string;
  display_name: string;
  role?: UserRole;
}): Promise<UserRow> {
  const rows = await query<UserRow>(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.email, input.password_hash, input.display_name, input.role ?? "user"],
  );
  return rows[0];
}

/** API-safe projection (drops password_hash). */
export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
  };
}
