export const darkenColor = (hex: string, percent: number) => {
  hex = hex.replace("#", "");

  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.max(0, Math.floor(r * (1 - percent)));
  g = Math.max(0, Math.floor(g * (1 - percent)));
  b = Math.max(0, Math.floor(b * (1 - percent)));

  return `#${[r, g, b]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
};

export const contrastTextColor = (hex: string) => {
  const normalized = hex.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return "#ffffff";

  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;

  return luminance > 0.179 ? "#000000" : "#ffffff";
};
