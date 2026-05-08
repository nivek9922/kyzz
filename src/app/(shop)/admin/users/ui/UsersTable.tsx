'use client';

import { changeUserRole } from '@/actions';
import type { User } from '@/interfaces';

interface Props {
  users: User[];
}

export const UsersTable = ({ users }: Props) => (
  <div className="flex flex-col divide-y divide-kyzz-secondary border border-kyzz-secondary">

    {/* Header */}
    <div className="hidden md:grid grid-cols-[1fr_1fr_140px] gap-4 px-5 py-3 bg-kyzz-tertiary">
      {['Nombre', 'Email', 'Rol'].map((h) => (
        <p key={h} className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">{h}</p>
      ))}
    </div>

    {users.map((user) => (
      <div
        key={user.id}
        className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_140px] gap-4 items-center px-5 py-4 hover:bg-kyzz-tertiary/50 transition-colors"
      >
        {/* Nombre */}
        <div className="min-w-0">
          <p className="text-sm text-kyzz-dark font-medium truncate">{user.name}</p>
          <p className="text-xs text-kyzz-muted truncate md:hidden">{user.email}</p>
        </div>

        {/* Email */}
        <p className="hidden md:block text-xs text-kyzz-muted truncate">{user.email}</p>

        {/* Role select */}
        <select
          value={user.role}
          onChange={(e) => changeUserRole(user.id, e.target.value)}
          className="bg-transparent border border-kyzz-secondary text-[11px] tracking-widest uppercase text-kyzz-muted px-3 py-1.5 focus:outline-none focus:border-kyzz-primary transition-colors cursor-pointer hover:border-kyzz-primary"
        >
          <option value="admin">Admin</option>
          <option value="user">Usuario</option>
        </select>
      </div>
    ))}
  </div>
);
