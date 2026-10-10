const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty']

/** 3 → "Three"; numbers past twenty stay numeric. */
export const numberWord = (n: number) => WORDS[n] ?? String(n)
export const numberWordLower = (n: number) => (WORDS[n] ? WORDS[n].toLowerCase() : String(n))

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** "a, b and c" */
export const joinAnd = (parts: string[]) =>
  parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
