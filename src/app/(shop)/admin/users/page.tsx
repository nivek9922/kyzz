export const revalidate = 0;

import { redirect } from "next/navigation";
import { getPaginatedUsers } from "@/actions";
import { titleFont } from "@/config/fonts";
import { UsersTable } from './ui/UsersTable';

export default async function AdminUsersPage() {
  const { ok, users = [] } = await getPaginatedUsers();
  if (!ok) redirect("/auth/login");

  return (
    <div>
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Usuarios
        </h1>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      <UsersTable users={users} />
    </div>
  );
}
