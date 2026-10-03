import { getTeamData } from "@/modules/team/repository";
import { TeamClient } from "@/modules/team/team-client";

export default async function TeamPage() {
  const { members, roles, myRole, isDemo } = await getTeamData();
  return <TeamClient members={members} roles={roles} myRole={myRole} isDemo={isDemo} />;
}
