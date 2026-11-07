export const greeting = (now = new Date()) => {
  const h = now.getHours()
  if (h >= 4 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}
