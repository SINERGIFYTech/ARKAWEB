import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenantId } from "@/lib/tenant";

export interface TeamMember {
  tenantUserId: string;
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
}

export interface TeamRole {
  id: string;
  name: string;
}

export async function getTeamData(): Promise<{ members: TeamMember[]; roles: TeamRole[]; myRole: string | null; isDemo: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { members: [], roles: [], myRole: null, isDemo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rolesData } = await supabase.from("roles").select("id, name").eq("tenant_id", tenantId);
  const roles: TeamRole[] = rolesData ?? [];

  const { data: membersData } = await supabase
    .from("tenant_users")
    .select("id, user_id, status, role_id, users(email), roles(name)")
    .eq("tenant_id", tenantId);

  const members: TeamMember[] = (membersData ?? []).map((m: any) => ({
    tenantUserId: m.id,
    userId: m.user_id,
    email: m.users?.email ?? "—",
    roleId: m.role_id,
    roleName: m.roles?.name ?? "—",
    status: m.status,
  }));

  const me = members.find((m) => m.userId === user?.id);

  return { members, roles, myRole: me?.roleName ?? null, isDemo: false };
}

async function assertCanManageTeam(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data } = await supabase
    .from("tenant_users")
    .select("roles(name)")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  const roleName = (data as any)?.roles?.name;
  if (roleName !== "Owner" && roleName !== "Admin") {
    throw new Error("Solo Owner o Admin pueden administrar el equipo.");
  }
}

export async function inviteMember(input: { email: string; roleId: string }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");
  await assertCanManageTeam(tenantId);

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${siteUrl}/accept-invite`,
  });

  if (inviteError || !invited.user) {
    throw new Error(inviteError?.message ?? "No se pudo enviar la invitación.");
  }

  await admin.from("users").upsert({ id: invited.user.id, email: input.email });

  const { error: membershipError } = await admin.from("tenant_users").insert({
    tenant_id: tenantId,
    user_id: invited.user.id,
    role_id: input.roleId,
    status: "INVITED",
  });

  if (membershipError) throw new Error(membershipError.message);
}

export async function updateMemberRole(tenantUserId: string, roleId: string) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");
  await assertCanManageTeam(tenantId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_users")
    .update({ role_id: roleId })
    .eq("id", tenantUserId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

export async function removeMember(tenantUserId: string) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");
  await assertCanManageTeam(tenantId);

  const supabase = await createClient();
  const { error } = await supabase.from("tenant_users").delete().eq("id", tenantUserId).eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

// Llamado desde /accept-invite una vez que el usuario invitado ya tiene sesión
// (por el magic link). Usa el cliente admin porque su membresía sigue en
// estado INVITED y por eso auth_tenant_ids() todavía no lo reconoce — se
// acota a sus PROPIAS filas (user_id = su propia sesión), nunca a otras.
export async function acceptOwnInvite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_users")
    .update({ status: "ACTIVE" })
    .eq("user_id", user.id)
    .eq("status", "INVITED");

  if (error) throw new Error(error.message);
}
