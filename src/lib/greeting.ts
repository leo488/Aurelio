export const greeting = (now = new Date()) => {
  const h = now.getHours()
  if (h >= 4 && h < 12) return 'Morning'
  if (h >= 12 && h < 17) return 'Afternoon'
  return 'Evening'
}
