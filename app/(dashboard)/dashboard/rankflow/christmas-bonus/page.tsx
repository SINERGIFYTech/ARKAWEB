import { previewChristmasBonus, getChristmasBonusHistory, getGenealogyData } from "@/modules/rankflow/repository";
import { ChristmasBonusClient } from "@/modules/rankflow/christmas-bonus-client";

export default async function ChristmasBonusPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const [{ config, rows }, history, { isDemo }] = await Promise.all([
    previewChristmasBonus(year),
    getChristmasBonusHistory(year),
    getGenealogyData(),
  ]);

  return (
    <ChristmasBonusClient
      year={year}
      enabled={config.christmasBonus.enabled}
      basedOn={config.christmasBonus.basedOn}
      percent={config.christmasBonus.percent}
      preview={rows}
      history={history}
      isDemo={isDemo}
    />
  );
}
