import { Router } from 'express';

/** A single inspirational quote. */
export interface Quote {
  readonly text: string;
  readonly author: string;
}

/** Small static collection of quotes served by the demo endpoint. */
export const quotes: readonly Quote[] = [
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'Programs must be written for people to read.', author: 'Harold Abelson' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
];

/**
 * Pick a random quote from the static list.
 */
export function randomQuote(): Quote {
  const index = Math.floor(Math.random() * quotes.length);
  // `quotes` is non-empty, so this index is always valid.
  return quotes[index] as Quote;
}

/**
 * Router exposing `GET /quote`, returning a random quote as JSON.
 */
export const quoteRouter = Router();

quoteRouter.get('/quote', (_req, res) => {
  res.json({ quote: randomQuote() });
});
