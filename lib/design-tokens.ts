export type AccentSwatch = {
  name: string;
  hex: string;
};

export const brandAccent = {
  name: "Lime",
  note: "Base — original bizim circle chartreuse",
  bg: "#C1FF72",
  hover: "#B4F25F",
  ring: "rgba(193,255,114,0.55)",
  ink: "#0A0A0A",
  darkText: "#4A7018",
} as const;

export const accentSwatches = [
  { name: "Lime · Mist", hex: "#EAFCC4" },
  { name: "Lime · Soft", hex: "#DBFB9E" },
  { name: "Lime", hex: "#C1FF72" },
  { name: "Lime · Bright", hex: "#B0E558" },
  { name: "Lime · Deep", hex: "#8FC23A" },
  { name: "Mint", hex: "#B8E8C9" },
  { name: "Pistachio", hex: "#C8DBA0" },
  { name: "Sky", hex: "#B8D8E8" },
  { name: "Powder", hex: "#C8D8E5" },
  { name: "Ice", hex: "#DCEAF0" },
  { name: "Lavender", hex: "#D5C8E8" },
  { name: "Blush", hex: "#F0C8C8" },
  { name: "Peach", hex: "#F5C9A8" },
  { name: "Apricot", hex: "#F0B888" },
  { name: "Lemon", hex: "#F5E58A" },
  { name: "Buttercream", hex: "#F4E8B5" },
  { name: "Cream", hex: "#F0E8D0" },
  { name: "Sand-Light", hex: "#E8D7B5" },
  { name: "Rose-Light", hex: "#E8B8C0" },
  { name: "Sage-Light", hex: "#CCD8B8" },
] as const satisfies readonly AccentSwatch[];

export const mascotAccentSwatches = accentSwatches.filter(
  (accent) => !accent.name.toLowerCase().includes("lime")
);
