export function normalizedLevenshtein(a: string, b: string): number {
  const s1 = a.trim().toLowerCase()
  const s2 = b.trim().toLowerCase()
  if (s1 === s2) return 1
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1

  const distances: number[][] = Array.from({ length: s1.length + 1 }, (_, i) =>
    Array.from({ length: s2.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + cost
      )
    }
  }

  const distance = distances[s1.length][s2.length]
  return 1 - distance / maxLen
}

export function findSimilarStrings(
  candidate: string,
  existing: string[],
  threshold = 0.75
): string[] {
  return existing.filter((s) => normalizedLevenshtein(candidate, s) >= threshold)
}
