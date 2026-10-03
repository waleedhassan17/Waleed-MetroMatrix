import { useEffect, useState } from 'react';

/** `value`, once it has stopped changing for `ms` — for search boxes. */
export function useDebouncedValue<T>(value: T, ms = 350): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

export default useDebouncedValue;
