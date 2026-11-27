export const name = (x: unknown) => (x && typeof x === 'object' && 'name' in x ? String((x as { name: string }).name) : '');
export const tableSx = { overflowX: 'auto' } as const;
