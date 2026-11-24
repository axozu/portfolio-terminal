interface PagePlaceholderProps {
  /** Технический идентификатор страницы; не пользовательский текст. */
  pageId: string;
}

/** Заглушка страницы на время каркаса. Заменяется реальными страницами на этапах 4–7. */
export function PagePlaceholder({ pageId }: PagePlaceholderProps) {
  return (
    <section data-testid={`page-${pageId}`} className="border border-border bg-card p-6">
      <code className="font-mono text-sm text-primary">{pageId}</code>
    </section>
  );
}
