export function formatStatusLabel(value: string) {
  const key = value.toLowerCase();

  if (key === "coming_soon") {
    return "unavailable";
  }

  return key.replaceAll("_", " ");
}
