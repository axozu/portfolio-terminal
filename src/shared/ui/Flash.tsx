import { useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface FlashProps {
  /** Значение, изменение которого вызывает вспышку. */
  value: number;
  children: ReactNode;
  className?: string;
}

/**
 * Кратко подсвечивает содержимое зелёным или красным при изменении `value`.
 * Анимация перезапускается сменой ключа. При prefers-reduced-motion вспышки нет.
 */
export function Flash({ value, children, className }: FlashProps) {
  const [previous, setPrevious] = useState(value);
  const [flash, setFlash] = useState<{ direction: 'up' | 'down' | null; count: number }>({
    direction: null,
    count: 0,
  });

  // Сравнение с прошлым рендером прямо во время рендера (рекомендованный React способ).
  if (value !== previous) {
    setPrevious(value);
    setFlash({ direction: value > previous ? 'up' : 'down', count: flash.count + 1 });
  }

  return (
    <span
      key={flash.count}
      data-flash={flash.direction ?? undefined}
      className={cn(
        'rounded-[1px] motion-reduce:animate-none',
        flash.direction === 'up' && 'animate-flash-gain',
        flash.direction === 'down' && 'animate-flash-loss',
        className,
      )}
    >
      {children}
    </span>
  );
}
