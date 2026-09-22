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
  type: RelationType;
  label: string;
}

export const SCHEMA = {
  tables: [
    { id: 'users', name: 'Users', columns: ['id (PK)', 'username', 'email', 'password'] },
    { id: 'posts', name: 'Posts', columns: ['id (PK)', 'user_id (FK)', 'title', 'content'] },
    { id: 'tags', name: 'Tags', columns: ['id (PK)', 'name'] },
    { id: 'post_tags', name: 'PostTags', columns: ['post_id (FK)', 'tag_id (FK)'] },
  ] as Table[],
  relations: [
    { id: 'r1', from: 'users', to: 'posts', type: '1:N', label: 'One User to Many Posts' },
    { id: 'r2', from: 'posts', to: 'users', type: 'N:1', label: 'Many Posts to One User' },
    { id: 'r3', from: 'posts', to: 'post_tags', type: '1:N', label: 'Posts to Link Table' },
    { id: 'r4', from: 'tags', to: 'post_tags', type: '1:N', label: 'Tags to Link Table' },
  ] as Relation[],
};
