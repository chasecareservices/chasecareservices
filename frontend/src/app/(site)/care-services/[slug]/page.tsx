import { ServiceDetail, serviceMetadata } from "@/components/services";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return serviceMetadata((await params).slug);
}

export default async function Page({ params }: Props) {
  return <ServiceDetail slug={(await params).slug} group="care" />;
}
