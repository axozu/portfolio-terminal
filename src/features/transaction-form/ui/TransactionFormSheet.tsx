import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '@/shared/store/ui';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';

/** Форма (Zod, react-hook-form, поиск активов) грузится отдельным чанком при первом открытии. */
const TransactionForm = lazy(() =>
  import('./TransactionForm').then((m) => ({ default: m.TransactionForm })),
);

function FormSkeleton() {
  return (
    <div className="grid gap-4 p-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/**
 * Форма сделки в боковой панели (на телефоне — на весь экран). Открывается из любого места
 * через UI-стор: кнопка в шапке, «Купить/Продать» на странице актива, «Изменить» в таблице.
 */
export function TransactionFormSheet() {
  const { t } = useTranslation();
  const state = useUiStore((s) => s.transactionForm);
  const close = useUiStore((s) => s.closeTransactionForm);

  return (
    <Sheet
      open={state.open}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-card p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle>
            {state.open && state.mode === 'edit'
              ? t('transactionForm.editTitle')
              : t('transactionForm.createTitle')}
          </SheetTitle>
          <SheetDescription>{t('transactionForm.description')}</SheetDescription>
        </SheetHeader>
        {state.open ? (
          <Suspense fallback={<FormSkeleton />}>
            <TransactionForm
              // Новый экземпляр формы на каждое открытие — значения не «протекают» между сделками.
              key={
                state.mode === 'edit'
                  ? state.transaction.id
                  : `new-${state.prefill.type ?? ''}-${state.prefill.ticker ?? ''}`
              }
              state={state}
              onClose={close}
            />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
