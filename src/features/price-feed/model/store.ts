import { create } from 'zustand';

interface PriceFeedState {
  /** Пользователь поставил фид на паузу кнопкой в шапке. */
  paused: boolean;
  togglePaused: () => void;
}

/** Состояние live-цен. Сам фид (тики, текущие цены) подключается на этапе 8. */
export const usePriceFeedStore = create<PriceFeedState>()((set) => ({
  paused: false,
  togglePaused: () => {
    set((state) => ({ paused: !state.paused }));
  },
}));
