import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { useUiStore } from '@/shared/store/ui';
import { cn } from '@/shared/lib/utils';
import { BrandMark } from './BrandMark';
import { NAV_ITEMS } from './navigation';

/**
 * Боковая навигация. ≥1280 — полная (можно свернуть), 768–1279 — всегда иконки,
 * <768 — скрыта (вместо неё нижнее меню). Подписи в свёрнутом виде остаются для скринридеров.
 */
export function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const labelClass = cn('truncate max-xl:sr-only', collapsed && 'xl:sr-only');

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-card md:flex',
        'md:w-rail xl:w-sidebar',
        collapsed && 'xl:w-rail',
      )}
    >
      <div className="flex h-header items-center gap-2.5 border-b px-4">
        <BrandMark className="size-5 shrink-0" />
        <span className={cn('num text-[13px] font-medium', labelClass)}>{t('app.name')}</span>
      </div>

      <nav aria-label={t('nav.label')} className="flex-1 py-2">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                title={t(labelKey)}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-9 items-center gap-3 px-[1.125rem] text-[13px] transition-colors',
                    'text-muted-foreground hover:bg-accent hover:text-foreground',
                    isActive &&
                      'bg-accent text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-primary',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className={labelClass}>{t(labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        onClick={toggle}
        className="hidden h-10 items-center gap-3 border-t px-[1.125rem] text-xs text-muted-foreground hover:text-foreground xl:flex"
      >
        {collapsed ? (
          <PanelLeftOpen aria-hidden="true" className="size-4 shrink-0" />
        ) : (
          <PanelLeftClose aria-hidden="true" className="size-4 shrink-0" />
        )}
        <span className={cn(collapsed && 'sr-only')}>
          {collapsed ? t('nav.expand') : t('nav.collapse')}
        </span>
      </button>
    </aside>
  );
}
