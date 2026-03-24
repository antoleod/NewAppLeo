export type OmsSex = 'female' | 'male';

export interface OmsMonthRow {
  month: number;
  weight: { p3: number; p15: number; p50: number; p85: number; p97: number };
  height: { p3: number; p15: number; p50: number; p85: number; p97: number };
  headCirc: { p50: number };
}

function row(
  month: number,
  weight: [number, number, number, number, number],
  height: [number, number, number, number, number],
  headCircP50: number,
): OmsMonthRow {
  return {
    month,
    weight: { p3: weight[0], p15: weight[1], p50: weight[2], p85: weight[3], p97: weight[4] },
    height: { p3: height[0], p15: height[1], p50: height[2], p85: height[3], p97: height[4] },
    headCirc: { p50: headCircP50 },
  };
}

export const omsBySex: Record<OmsSex, OmsMonthRow[]> = {
  female: [
    row(0, [2.4, 2.8, 3.2, 3.8, 4.2], [45.4, 47.2, 49.1, 51.0, 52.9], 34.2),
    row(1, [3.2, 3.7, 4.2, 4.9, 5.5], [49.8, 51.2, 53.0, 54.6, 56.2], 36.5),
    row(2, [4.0, 4.5, 5.1, 5.9, 6.6], [53.0, 54.5, 56.0, 57.8, 59.4], 38.3),
    row(3, [4.6, 5.2, 5.8, 6.6, 7.4], [55.5, 57.0, 58.8, 60.5, 62.1], 39.5),
    row(4, [5.1, 5.7, 6.4, 7.3, 8.1], [57.8, 59.3, 61.2, 62.8, 64.5], 40.4),
    row(5, [5.5, 6.1, 6.9, 7.8, 8.7], [59.6, 61.2, 63.1, 65.0, 66.8], 41.2),
    row(6, [5.8, 6.5, 7.3, 8.3, 9.2], [61.2, 62.9, 64.7, 66.7, 68.6], 41.8),
    row(7, [6.1, 6.8, 7.6, 8.7, 9.6], [62.7, 64.3, 66.2, 68.2, 70.1], 42.4),
    row(8, [6.3, 7.0, 7.9, 9.0, 10.0], [64.0, 65.7, 67.7, 69.7, 71.7], 42.9),
    row(9, [6.6, 7.3, 8.2, 9.3, 10.4], [65.3, 67.0, 68.9, 71.0, 73.0], 43.3),
    row(10, [6.8, 7.5, 8.5, 9.6, 10.7], [66.5, 68.2, 70.1, 72.2, 74.3], 43.7),
    row(11, [7.0, 7.7, 8.7, 9.9, 11.0], [67.6, 69.4, 71.5, 73.7, 75.8], 44.1),
    row(12, [7.1, 7.9, 8.9, 10.1, 11.3], [68.6, 70.4, 72.6, 74.8, 77.0], 44.4),
    row(13, [7.3, 8.1, 9.2, 10.4, 11.7], [69.5, 71.4, 73.7, 75.9, 78.2], 44.7),
    row(14, [7.5, 8.3, 9.4, 10.7, 12.0], [70.4, 72.3, 74.7, 77.0, 79.3], 45.0),
    row(15, [7.7, 8.5, 9.6, 10.9, 12.3], [71.3, 73.2, 75.7, 78.0, 80.3], 45.2),
    row(16, [7.8, 8.7, 9.8, 11.1, 12.6], [72.1, 74.1, 76.6, 78.9, 81.3], 45.4),
    row(17, [8.0, 8.9, 10.0, 11.4, 12.9], [72.9, 74.9, 77.4, 79.8, 82.2], 45.6),
    row(18, [8.2, 9.1, 10.2, 11.6, 13.2], [73.6, 75.7, 78.2, 80.7, 83.1], 45.8),
    row(19, [8.3, 9.2, 10.4, 11.8, 13.5], [74.4, 76.5, 79.1, 81.7, 84.1], 46.0),
    row(20, [8.5, 9.4, 10.6, 12.1, 13.8], [75.1, 77.3, 79.9, 82.5, 85.0], 46.2),
    row(21, [8.7, 9.6, 10.9, 12.3, 14.1], [75.8, 78.0, 80.7, 83.4, 85.9], 46.4),
    row(22, [8.8, 9.8, 11.1, 12.6, 14.4], [76.4, 78.7, 81.5, 84.2, 86.8], 46.6),
    row(23, [9.0, 10.0, 11.3, 12.8, 14.7], [77.1, 79.4, 82.2, 85.1, 87.7], 46.8),
    row(24, [9.2, 10.2, 11.5, 13.1, 15.0], [77.7, 80.1, 83.0, 85.9, 88.6], 47.0),
  ],
  male: [
    row(0, [2.5, 2.9, 3.3, 3.9, 4.4], [46.0, 47.7, 49.9, 52.0, 54.0], 34.5),
    row(1, [3.4, 3.9, 4.5, 5.1, 5.8], [50.8, 52.2, 54.7, 56.5, 58.2], 37.0),
    row(2, [4.3, 4.8, 5.6, 6.3, 7.1], [54.2, 55.8, 58.4, 60.2, 61.9], 39.1),
    row(3, [5.0, 5.6, 6.4, 7.2, 8.0], [57.0, 58.7, 61.1, 63.0, 64.8], 40.5),
    row(4, [5.6, 6.2, 7.0, 7.8, 8.7], [59.1, 60.8, 63.2, 65.1, 66.9], 41.5),
    row(5, [6.0, 6.6, 7.5, 8.4, 9.3], [61.0, 62.7, 65.0, 67.0, 68.9], 42.4),
    row(6, [6.4, 7.1, 7.9, 8.9, 9.8], [62.7, 64.4, 66.7, 68.8, 70.8], 43.1),
    row(7, [6.7, 7.4, 8.3, 9.3, 10.3], [64.1, 65.9, 68.1, 70.3, 72.3], 43.7),
    row(8, [7.0, 7.7, 8.6, 9.6, 10.6], [65.5, 67.2, 69.5, 71.7, 73.7], 44.2),
    row(9, [7.2, 8.0, 8.9, 9.9, 10.9], [66.7, 68.5, 70.8, 73.0, 75.1], 44.6),
    row(10, [7.4, 8.2, 9.2, 10.2, 11.2], [67.9, 69.7, 72.0, 74.3, 76.4], 44.9),
    row(11, [7.6, 8.4, 9.4, 10.5, 11.5], [69.0, 70.8, 73.2, 75.6, 77.6], 45.3),
    row(12, [7.8, 8.6, 9.6, 10.8, 11.8], [70.1, 71.9, 74.4, 76.8, 78.9], 45.6),
    row(13, [8.0, 8.8, 9.9, 11.0, 12.1], [71.0, 72.9, 75.6, 78.0, 80.1], 45.9),
    row(14, [8.2, 9.0, 10.1, 11.3, 12.4], [72.0, 73.9, 76.7, 79.1, 81.3], 46.1),
    row(15, [8.4, 9.2, 10.3, 11.5, 12.7], [72.9, 74.8, 77.8, 80.2, 82.5], 46.3),
    row(16, [8.5, 9.4, 10.5, 11.7, 12.9], [73.7, 75.7, 78.9, 81.3, 83.6], 46.5),
    row(17, [8.7, 9.6, 10.7, 12.0, 13.2], [74.5, 76.5, 79.9, 82.3, 84.7], 46.7),
    row(18, [8.9, 9.8, 10.9, 12.2, 13.5], [75.3, 77.3, 80.8, 83.4, 85.7], 46.9),
    row(19, [9.0, 10.0, 11.1, 12.5, 13.8], [76.0, 78.1, 81.7, 84.4, 86.7], 47.1),
    row(20, [9.2, 10.2, 11.3, 12.7, 14.0], [76.7, 78.8, 82.6, 85.3, 87.7], 47.3),
    row(21, [9.4, 10.3, 11.5, 12.9, 14.3], [77.4, 79.5, 83.4, 86.2, 88.7], 47.5),
    row(22, [9.5, 10.5, 11.8, 13.2, 14.6], [78.0, 80.2, 84.2, 87.1, 89.6], 47.7),
    row(23, [9.7, 10.7, 12.0, 13.4, 14.8], [78.7, 80.9, 85.1, 88.0, 90.5], 47.9),
    row(24, [9.8, 10.9, 12.2, 13.6, 15.1], [79.3, 81.6, 85.9, 88.8, 91.4], 48.1),
  ],
};

function interpolateValue(left: number, right: number, ratio: number) {
  return left + (right - left) * ratio;
}

export function getOmsRow(sex: OmsSex, monthsFloat: number) {
  const table = omsBySex[sex];
  if (monthsFloat <= 0) return table[0];
  if (monthsFloat >= 24) return table[table.length - 1];
  const lowerMonth = Math.floor(monthsFloat);
  const upperMonth = Math.ceil(monthsFloat);
  const lower = table.find((row) => row.month === lowerMonth) ?? table[0];
  const upper = table.find((row) => row.month === upperMonth) ?? table[table.length - 1];
  if (lowerMonth === upperMonth) return lower;
  const ratio = monthsFloat - lowerMonth;
  return {
    month: monthsFloat,
    weight: {
      p3: interpolateValue(lower.weight.p3, upper.weight.p3, ratio),
      p15: interpolateValue(lower.weight.p15, upper.weight.p15, ratio),
      p50: interpolateValue(lower.weight.p50, upper.weight.p50, ratio),
      p85: interpolateValue(lower.weight.p85, upper.weight.p85, ratio),
      p97: interpolateValue(lower.weight.p97, upper.weight.p97, ratio),
    },
    height: {
      p3: interpolateValue(lower.height.p3, upper.height.p3, ratio),
      p15: interpolateValue(lower.height.p15, upper.height.p15, ratio),
      p50: interpolateValue(lower.height.p50, upper.height.p50, ratio),
      p85: interpolateValue(lower.height.p85, upper.height.p85, ratio),
      p97: interpolateValue(lower.height.p97, upper.height.p97, ratio),
    },
    headCirc: {
      p50: interpolateValue(lower.headCirc.p50, upper.headCirc.p50, ratio),
    },
  };
}

export function interpolatePercentileBand(p3: number, p15: number, p50: number, p85: number, p97: number) {
  const p10 = interpolateValue(p3, p15, 7 / 12);
  const p25 = interpolateValue(p15, p50, 10 / 35);
  const p75 = interpolateValue(p50, p85, 25 / 35);
  const p90 = interpolateValue(p85, p97, 5 / 12);
  return { p3, p10, p15, p25, p50, p75, p85, p90, p97 };
}
