'use client';

import { toast } from 'sonner';
import { IoTrashOutline } from 'react-icons/io5';
import { changeUserRole, deleteUser } from '@/actions';
import type { User } from '@/interfaces';

interface Props {
  users: User[];
}

const handleDeleteUser = (user: User) => {
  toast(`¿Eliminar a "${user.name}"?`, {
    description: 'Esta acción no se puede deshacer.',
    duration: 8000,
    action: {
      label: 'Eliminar',
      onClick: async () => {
        const { ok, message } = await deleteUser(user.id);
        if (ok) {
          toast.success('Usuario eliminado');
        } else {
          toast.error(message ?? 'No se pudo eliminar');
        }
      },
    },
    cancel: { label: 'Cancelar', onClick: () => {} },
  });
};

export const UsersTable = ({ users }: Props) => (
  <div className="flex flex-col divide-y divide-kyzz-secondary border border-kyzz-secondary">

    {/* Header */}
    <div className="hidden md:grid grid-cols-[1fr_1fr_140px_48px] gap-4 px-5 py-3 bg-kyzz-tertiary">
      {['Nombre', 'Email', 'Rol', ''].map((h) => (
        <p key={h} className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">{h}</p>
      ))}
    </div>

    {users.map((user) => (
      <div
        key={user.id}
        className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_140px_48px] gap-4 items-center px-5 py-4 hover:bg-kyzz-tertiary/50 transition-colors group"
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
          onChange={async (e) => {
            const { ok } = await changeUserRole(user.id, e.target.value);
            if (ok) {
              toast.success('Rol actualizado', { description: `${user.name} → ${e.target.value}` });
            } else {
              toast.error('No se pudo cambiar el rol');
            }
          }}
          className="bg-transparent border border-kyzz-secondary text-[11px] tracking-widest uppercase text-kyzz-muted px-3 py-1.5 focus:outline-none focus:border-kyzz-primary transition-colors cursor-pointer hover:border-kyzz-primary"
        >
          <option value="admin">Admin</option>
          <option value="user">Usuario</option>
        </select>

        {/* Eliminar */}
        <button
          onClick={() => handleDeleteUser(user)}
          className="hidden md:flex items-center justify-center w-8 h-8 border border-kyzz-secondary text-kyzz-muted hover:border-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Eliminar usuario"
        >
          <IoTrashOutline size={13} />
        </button>
      </div>
    ))}
  </div>
);
