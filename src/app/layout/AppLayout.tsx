import { Outlet } from 'react-router';

/** Временный каркас. Сайдбар, шапка и бегущая строка появятся на этапе 3. */
export function AppLayout() {
  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-screen-2xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
