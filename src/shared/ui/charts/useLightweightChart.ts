import {
  ColorType,
  createChart,
  CrosshairMode,
  type DeepPartial,
  type ChartOptions,
  type IChartApi,
} from 'lightweight-charts';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { readChartTheme } from './chartTheme';

/**
 * Создаёт график Lightweight Charts в контейнере и корректно его убирает:
 * размер — через ResizeObserver, при размонтировании — `chart.remove()`.
 * Возвращает экземпляр после создания (в первом рендере — `null`).
 */
export function useLightweightChart(
  containerRef: RefObject<HTMLDivElement | null>,
  options: DeepPartial<ChartOptions> = {},
): IChartApi | null {
  const [chart, setChart] = useState<IChartApi | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const theme = readChartTheme();
    const instance = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: theme.axis,
        fontFamily: theme.fontFamily,
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: theme.grid },
      },
      rightPriceScale: { borderColor: theme.border },
      timeScale: { borderColor: theme.border, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: theme.axis, labelBackgroundColor: theme.surface },
        horzLine: { color: theme.axis, labelBackgroundColor: theme.surface },
      },
      handleScale: false,
      handleScroll: false,
      ...optionsRef.current,
    });

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      instance.resize(Math.floor(width), Math.floor(height));
    });
    observer.observe(container);
    setChart(instance);

    return () => {
      observer.disconnect();
      instance.remove();
      setChart(null);
    };
  }, [containerRef]);

  return chart;
}
