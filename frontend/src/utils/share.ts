import { formatDateInput } from "./formatters";

export type ShareExpiryPreset = "7d" | "14d" | "30d" | "permanent" | "custom";

export function buildShareTextFilename(nameInput: string, fallbackName: string) {
  const candidate = (nameInput.trim() || fallbackName.trim() || "guest")
    .replace(/[\\/]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.md$/i, "");
  const base = candidate || "guest";
  return `${base}.md`;
}

export function resolveShareExpiryUnix(
  preset: ShareExpiryPreset,
  customDate: string,
) {
  if (preset === "permanent") {
    return 0;
  }
  if (preset === "custom") {
    if (!customDate) {
      throw new Error("请选择自定义到期日期。");
    }
    const next = new Date(`${customDate}T23:59:59`);
    if (Number.isNaN(next.getTime())) {
      throw new Error("自定义到期日期无效。");
    }
    return Math.floor(next.getTime() / 1000);
  }
  const days = preset === "7d" ? 7 : preset === "14d" ? 14 : 30;
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

export function describeShareExpiry(expiresAt: number) {
  if (!expiresAt) {
    return "当前分享永久有效";
  }
  return `当前分享将于 ${new Date(expiresAt * 1000).toLocaleString()} 到期`;
}

export function defaultShareCustomDate() {
  const next = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return formatDateInput(next);
}

export function minShareCustomDate() {
  return formatDateInput(new Date());
}

export function maxShareCustomDate() {
  return formatDateInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
}
