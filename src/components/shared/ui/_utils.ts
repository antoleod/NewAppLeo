export function withColorOpacity(color: string, opacity: number): string {
  const alpha = Math.max(0, Math.min(1, opacity));
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const value = hex[1];
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  const rgb = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const channels = rgb[1].split(',').slice(0, 3).map((part) => part.trim());
    return `rgba(${channels.join(', ')}, ${alpha})`;
  }
  return color;
}
