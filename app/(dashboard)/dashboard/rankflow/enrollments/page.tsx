import { getEnrollments } from "@/modules/store/repository";
import { EnrollmentsClient } from "@/modules/store/enrollments-client";

export default async function EnrollmentsPage() {
  const { enrollments, isDemo } = await getEnrollments();
  return <EnrollmentsClient enrollments={enrollments} isDemo={isDemo} />;
}
