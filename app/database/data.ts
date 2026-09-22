export type RelationType = '1:N' | 'N:1' | 'N:M';

export interface Table {
  id: string;
  name: string;
  columns: string[];
}

export interface Relation {
  id: string;
  from: string;
  to: string;
  via?: string; // Only used for N:M
  type: RelationType;
  label: string;
}

export const SCHEMA = {
  tables: [
    { id: 'users', name: 'Users', columns: ['id (PK)', 'username', 'email'] },
    { id: 'roles', name: 'Roles', columns: ['id (PK)', 'role_name', 'permissions'] },
    { id: 'user_roles', name: 'UserRoles', columns: ['user_id (FK)', 'role_id (FK)'] },
    { id: 'posts', name: 'Posts', columns: ['id (PK)', 'user_id (FK)', 'title'] },
  ] as Table[],
  relations: [
    { id: 'r1', from: 'users', to: 'posts', type: '1:N', label: 'Users ↔ Posts' },
    { id: 'r2', from: 'users', to: 'roles', via: 'user_roles', type: 'N:M', label: 'Users ↔ Roles (M:M)' },
  ] as Relation[],
};
