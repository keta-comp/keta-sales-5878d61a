/**
 * Xizmatlar — salon va sartaroshxona katalogi.
 *
 * Xizmat `services` yozuvi: nomi, davomiyligi, narxi va depozit qoidasi. Qabul
 * jadvali, onlayn bron, hisob-kitob va ustalar komissiyasi shu yozuvni oladi,
 * eski «Xizmatlar» CRM moduli esa erkin matn edi — narx sahifada turgani bilan
 * bronda ko'rinmasdi.
 */

import { createFileRoute, Navigate } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/primitives";
import { ServicesCatalog } from "@/components/app/services-catalog";
import { t } from "@/lib/i18n";
import { useSectionTitle } from "@/lib/terminology";
import { useSectionVisibility } from "@/lib/section-visibility";

export const Route = createFileRoute("/_authenticated/dashboard/services")({
  head: () => ({
    meta: [
      { title: t("Xizmatlar — KetaOne") },
      { name: "description", content: t("Xizmat nomi, davomiyligi, narxi va depozit qoidasi.") },
      { property: "og:title", content: t("Xizmatlar — KetaOne") },
      {
        property: "og:description",
        content: t("Xizmat nomi, davomiyligi, narxi va depozit qoidasi."),
      },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  useSectionTitle(t("Xizmatlar"));
  const { loading, offers } = useSectionVisibility();

  // Xizmatlar katalogi soha sahifasi: menyuda bo'lmasa to'g'ridan-to'g'ri kirish
  // dashboard'ga qaytadi (Kurslar sahifasi bilan bir xil himoya).
  if (!loading && !offers("/dashboard/services")) return <Navigate to="/dashboard" replace />;

  return (
    <>
      <PageHeader
        title={t("Xizmatlar")}
        description={t("Bron, narx va ustalar komissiyasi shu katalogdan oladi.")}
      />
      <ServicesCatalog />
    </>
  );
}
