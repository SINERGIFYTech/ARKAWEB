import { getGenealogyData, getVolumeEntriesForOpenPeriod } from "@/modules/rankflow/repository";
import { VolumeClient } from "@/modules/rankflow/volume-client";

export default async function VolumePage() {
  const [{ distributors, isDemo, period }, entries] = await Promise.all([
    getGenealogyData(),
    getVolumeEntriesForOpenPeriod(),
  ]);
  return <VolumeClient distributors={distributors} entries={entries} periodLabel={period?.label ?? null} isDemo={isDemo} />;
}
