export function slugifySeller(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}
