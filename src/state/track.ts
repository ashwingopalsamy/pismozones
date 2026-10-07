/** Analytics sink used by state actions. Narrowed to the event schema in analytics.ts. */
export type Track = (name: string, props: Record<string, string | number>) => void;
