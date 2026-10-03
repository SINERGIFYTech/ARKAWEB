"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import type { TeamMember, TeamRole } from "@/modules/team/repository";

const statusLabel: Record<string, string> = {
  ACTIVE: "Activo",
  INVITED: "Invitación pendiente",
  SUSPENDED: "Suspendido",
};

export function TeamClient({
  members,
  roles,
  myRole,
  isDemo,
}: {
  members: TeamMember[];
  roles: TeamRole[];
  myRole: string | null;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles.find((r) => r.name === "Member")?.id ?? roles[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canManage = myRole === "Owner" || myRole === "Admin";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, roleId }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo invitar");
      return;
    }
    setEmail("");
    setMessage(`Invitación enviada a ${email}.`);
    router.refresh();
  }

  async function handleRoleChange(tenantUserId: string, newRoleId: string) {
    await fetch(`/api/team/members/${tenantUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: newRoleId }),
    });
    router.refresh();
  }

  async function handleRemove(tenantUserId: string) {
    if (!confirm("¿Quitar a esta persona del equipo?")) return;
    await fetch(`/api/team/members/${tenantUserId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
        <p className="text-sm text-muted-foreground">
          {members.length} miembro(s)
          {isDemo && " · modo demo"}
          {!isDemo && !canManage && " · solo Owner/Admin pueden invitar o quitar personas"}
        </p>
      </div>

      {canManage && (
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-medium text-muted-foreground">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="compañero@empresa.com"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Rol</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <UserPlus size={14} /> {loading ? "Enviando..." : "Invitar"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              {canManage && <th className="px-4 py-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.tenantUserId} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{m.email}</td>
                <td className="px-4 py-3">
                  {canManage && m.roleName !== "Owner" ? (
                    <select
                      defaultValue={m.roleId}
                      onChange={(e) => handleRoleChange(m.tenantUserId, e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-muted-foreground">{m.roleName}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{statusLabel[m.status] ?? m.status}</td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {m.roleName !== "Owner" && (
                      <button
                        onClick={() => handleRemove(m.tenantUserId)}
                        className="rounded p-1.5 text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
