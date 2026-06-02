import { redirect } from "next/navigation";
import { getPaginatedUsers } from "@/actions";
import { titleFont } from "@/config/fonts";
import { AdminSearchInput, Pagination } from "@/components";
import { UsersTable } from './ui/UsersTable';

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminUsersPage(props: Props) {
  const searchParams = await props.searchParams;
  const query = searchParams.q ?? '';
  const page  = Number(searchParams.page ?? '1');

  const { ok, users = [], totalPages = 1, total = 0 } = await getPaginatedUsers({ page, query });
  if (!ok) redirect("/auth/login");

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Usuarios
        </h1>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      {/* Buscador */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <AdminSearchInput
          defaultValue={query}
          placeholder="Buscar por nombre o email..."
        />
        {total > 0 && (
          <p className="text-[11px] text-kyzz-muted shrink-0">
            {total} usuario{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4 text-center border border-kyzz-secondary">
          <p className="text-sm text-kyzz-muted">
            {query ? `Sin resultados para "${query}"` : 'Sin usuarios registrados'}
          </p>
        </div>
      ) : (
        <>
          <UsersTable users={users} />
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination totalPages={totalPages} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
