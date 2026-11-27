import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { certificationLine } from "@/lib/learning";

export type CertificateData = {
  number: string;
  verify_code: string;
  learner_name: string;
  course_title: string;
  certification_type: string;
  accrediting_body: string | null;
  cpd_hours: number | null;
  completed_on: string;
  revoked: boolean;
};

const PURPLE = rgb(0x3b / 255, 0x0a / 255, 0x5e / 255);
const ORANGE = rgb(0xf8 / 255, 0x9a / 255, 0x00 / 255);
const GREY = rgb(0.38, 0.36, 0.42);

/** The built-in PDF fonts only cover Western European letters: map Ghanaian letters (ɛ, ɔ, ŋ…) to the nearest. */
export function pdfSafe(text: string) {
  const map: Record<string, string> = { ɛ: "e", Ɛ: "E", ɔ: "o", Ɔ: "O", ŋ: "ng", Ŋ: "Ng", "’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-" };
  return text
    .replace(/[ɛƐɔƆŋŊ’‘“”–—]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e -ÿ]/g, "");
}

/** An A4 landscape certificate. */
export async function certificatePdf(c: CertificateData, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificate ${c.number}`);
  pdf.setAuthor("Chase Care Services");
  const page = pdf.addPage([841.89, 595.28]);
  const { width: W, height: H } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const centre = (text: string, y: number, font: typeof sans, size: number, color = PURPLE) => {
    let s = size;
    while (font.widthOfTextAtSize(text, s) > W - 160 && s > 10) s -= 1;
    page.drawText(text, { x: (W - font.widthOfTextAtSize(text, s)) / 2, y, size: s, font, color });
  };

  // Frame
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 22, y: 22, width: W - 44, height: H - 44, borderColor: PURPLE, borderWidth: 6 });
  page.drawRectangle({ x: 34, y: 34, width: W - 68, height: H - 68, borderColor: ORANGE, borderWidth: 1.5 });
  page.drawRectangle({ x: 34, y: H - 120, width: W - 68, height: 86, color: PURPLE });

  // Header
  const brand = "C H A S E";
  page.drawText(brand, { x: (W - sansBold.widthOfTextAtSize(brand, 30)) / 2, y: H - 80, size: 30, font: sansBold, color: rgb(1, 1, 1) });
  centre("CARE SERVICES  ·  CHASECARE ACADEMY", H - 104, sans, 10, ORANGE);

  centre(c.certification_type === "cpd" ? "CPD Certificate of Completion" : "Certificate of Completion", H - 175, serifBold, 34);
  centre("This is to certify that", H - 215, serif, 15, GREY);
  centre(pdfSafe(c.learner_name), H - 262, serifBold, 36);
  page.drawLine({ start: { x: W / 2 - 180, y: H - 274 }, end: { x: W / 2 + 180, y: H - 274 }, thickness: 1, color: ORANGE });
  centre("has successfully completed", H - 305, serif, 15, GREY);
  centre(pdfSafe(c.course_title), H - 345, serifBold, 26);
  centre(pdfSafe(certificationLine(c.certification_type, c.accrediting_body)), H - 375, sans, 12, GREY);

  const date = new Date(`${c.completed_on}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const facts = [`Completed ${date}`, ...(c.cpd_hours ? [`${c.cpd_hours} CPD hours`] : []), `Certificate ${c.number}`];
  centre(facts.join("   ·   "), H - 410, sansBold, 12);

  // Signature and date lines
  const line = (x: number, label: string, value: string) => {
    page.drawLine({ start: { x, y: 112 }, end: { x: x + 220, y: 112 }, thickness: 0.8, color: PURPLE });
    page.drawText(value, { x: x + (220 - serifBold.widthOfTextAtSize(value, 13)) / 2, y: 120, size: 13, font: serifBold, color: PURPLE });
    page.drawText(label, { x: x + (220 - sans.widthOfTextAtSize(label, 10)) / 2, y: 98, size: 10, font: sans, color: GREY });
  };
  line(120, "For Chase Care Services", "ChaseCare Academy");
  line(W - 340, "Date awarded", date);
  // Seal
  page.drawCircle({ x: W / 2, y: 118, size: 34, color: ORANGE });
  page.drawCircle({ x: W / 2, y: 118, size: 28, borderColor: rgb(1, 1, 1), borderWidth: 1.2 });
  const seal = "CHASE";
  page.drawText(seal, { x: W / 2 - sansBold.widthOfTextAtSize(seal, 11) / 2, y: 114, size: 11, font: sansBold, color: PURPLE });

  // Footer: verification
  centre(`Check this certificate at ${verifyUrl.replace(/^https?:\/\//, "")}  ·  code ${c.verify_code}`, 50, sans, 10, GREY);
  if (c.revoked) {
    page.drawText("REVOKED", { x: W / 2 - 170, y: H / 2 - 60, size: 90, font: sansBold, color: rgb(0.8, 0.1, 0.1), opacity: 0.35, rotate: degrees(18) });
  }
  return pdf.save();
}
