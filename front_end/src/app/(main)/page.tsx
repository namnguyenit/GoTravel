import HomeClient from "@/screens/home/components/HomeClient";
import { ComplexServices, ExperienceServices, PlaceServices, ServiceServices } from "@/services";
import HomeProvider from "@/screens/home/providers/home.provider";
import type { Experiences } from "@/modules/experience";
import type { Places } from "@/modules/place";
import type { Services } from "@/modules/service";
import type { ComplexOffering } from "@/services/complex";

export const dynamic = "force-dynamic";

export default async function Page() {
  let experiences: Experiences = [];
  let places: Places = [];
  let services: Services = [];
  let landmarks: Awaited<ReturnType<typeof PlaceServices.getLandmarks>> = [];
  let complexes: ComplexOffering[] = [];

  try {
    const data = await PlaceServices.getLandmarks();
    landmarks = data || [];
  } catch {
    console.warn("Could not load landmarks from API.");
  }

  try {
    const data = await ExperienceServices.getAll();
    experiences = data || [];
  } catch {
    console.warn("Could not load experiences from API.");
  }

  try {
    const data = await PlaceServices.getAll();
    places = data || [];
  } catch {
    console.warn("Could not load places from API.");
  }

  try {
    const data = await ServiceServices.getAll();
    services = data || [];
  } catch {
    console.warn("Could not load services from API.");
  }

  try {
    const data = await ComplexServices.getAll();
    complexes = data || [];
  } catch {
    console.warn("Could not load complexes from API.");
  }

  return (
    <HomeProvider
      initExperiences={experiences}
      initPlace={places}
      initServices={services}
      initLandmarks={landmarks}
      initComplexes={complexes}
    >
      <HomeClient />
    </HomeProvider>
  );
}
