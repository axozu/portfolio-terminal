import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '@/shared/store/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { focusTableSearch, useGlobalHotkeys } from '../model/useGlobalHotkeys';

function Key({ children }: { children: string }) {
  return (
    <kbd className="num inline-flex h-6 min-w-6 items-center justify-center rounded-sm border bg-raised px-1.5 text-xs text-foreground">
      {children}
    </kbd>
  );
}

/** Подключает горячие клавиши и показывает их список по «?». */
export function Hotkeys() {
  const { t } = useTranslation();
  const openCreateForm = useUiStore((s) => s.openCreateForm);
  const [helpOpen, setHelpOpen] = useState(false);

  const actions = useMemo(
    () => ({
      newTransaction: () => {
        openCreateForm();
      },
      focusSearch: focusTableSearch,
      showHelp: () => {
        setHelpOpen(true);
      },
    }),
    [openCreateForm],
  );
  useGlobalHotkeys(actions);

  const rows = [
    ['N', t('shortcuts.newTransaction')],
    ['/', t('shortcuts.search')],
    ['?', t('shortcuts.help')],
  ] as const;

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>{t('shortcuts.description')}</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-2 text-sm">
          {rows.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>
                <Key>{key}</Key>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
