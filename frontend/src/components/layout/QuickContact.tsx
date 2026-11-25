import { getSiteSettings } from "@/lib/content";
import { phoneDigits, whatsappLink } from "@/lib/format";

/** Floating Call / WhatsApp buttons on phones [§28]. Hidden until the numbers are set. */
export async function QuickContact() {
  const settings = await getSiteSettings();
  if (!settings.phone && !settings.whatsapp_number) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-brand-100 bg-white/95 p-3 backdrop-blur sm:hidden">
      {settings.phone && (
        <a
          href={`tel:${phoneDigits(settings.phone)}`}
          className="flex min-h-11 flex-1 items-center justify-center rounded-full border-2 border-brand-800 text-sm font-semibold text-brand-800"
        >
          Call us
        </a>
      )}
      {settings.whatsapp_number && (
        <a
          href={whatsappLink(settings.whatsapp_number, "Hello Chase Care Services, I would like some information.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#1f8f4e] text-sm font-semibold text-white"
        >
          WhatsApp us
        </a>
      )}
    </div>
  );
}
