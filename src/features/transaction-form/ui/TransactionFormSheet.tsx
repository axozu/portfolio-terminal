import { useTranslation } from 'react-i18next';
import { useUiStore } from '@/shared/store/ui';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { TransactionForm } from './TransactionForm';

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
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
