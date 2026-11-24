import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Поле ввода получает id и aria-атрибуты для связи с подписью и ошибкой. */
  children: (control: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/** Подпись, поле, подсказка и ошибка — связаны для скринридеров. */
export function FormField({ label, error, hint, className, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}
      {error ? (
        <p id={errorId} className="text-xs text-loss">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'h-9 w-full rounded-sm border border-input bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted-foreground aria-invalid:border-loss';

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cn(inputClass, className)} />;
}
