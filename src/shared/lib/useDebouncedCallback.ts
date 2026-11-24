import { useEffect, useRef } from 'react';

/** Вызывает `callback` через `delay` мс после последнего вызова (например, поиск при наборе). */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
): (...args: A) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  return (...args: A) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      latest.current(...args);
    }, delay);
  };
}
