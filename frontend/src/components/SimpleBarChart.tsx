import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { ChartGranularity } from "@/api/types";
import { formatMoney, formatNumber } from "@/utils/format";
import { formatChartBucketLabel, formatChartBucketTitle } from "@/utils/jalali";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface ChartPoint {
  date: string;
  [key: string]: string | number;
}

interface SimpleBarChartProps {
  data: ChartPoint[];
  series: ChartSeries[];
  height?: number;
  granularity?: ChartGranularity;
  /** When true, summary panel stays above bars so today is visible without scrolling past side panel. */
  infoPanelOnTop?: boolean;
  /** When set, shows a bold total like «۱۷ اقدام» above the series details. */
  totalLabel?: string;
  /** Hide series with zero value from the info panel for the active bucket. */
  hideZeroSeriesInInfo?: boolean;
  /** Do not render bars with zero value (avoids clutter when many series are sparse). */
  hideZeroBars?: boolean;
}

export function SimpleBarChart({
  data,
  series,
  height = 220,
  granularity = "day",
  infoPanelOnTop = true,
  totalLabel,
  hideZeroSeriesInInfo = false,
  hideZeroBars = false,
}: SimpleBarChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ChartPoint | null>(null);

  const chartData = useMemo(() => [...data].reverse(), [data]);
  const todayPoint = chartData.length ? chartData[0] : null;

  useEffect(() => {
    if (todayPoint) setActive(todayPoint);
  }, [todayPoint?.date]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = 0;
  }, [chartData, granularity]);

  if (!chartData.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        داده‌ای برای نمایش وجود ندارد.
      </Typography>
    );
  }

  if (!series.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        داده‌ای برای نمایش وجود ندارد.
      </Typography>
    );
  }

  const maxValue = Math.max(
    1,
    ...chartData.flatMap((point) => series.map((s) => Number(point[s.key] ?? 0)))
  );

  const tooltipPoint = active ?? todayPoint ?? chartData[0];
  const infoSeries = hideZeroSeriesInInfo
    ? series.filter((s) => Number(tooltipPoint[s.key] ?? 0) > 0)
    : series;
  const totalValue =
    totalLabel != null
      ? series.reduce((sum, s) => sum + Number(tooltipPoint[s.key] ?? 0), 0)
      : 0;

  const infoPanel = (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: "action.hover",
        minHeight: infoPanelOnTop ? 136 : height - 24,
        width: infoPanelOnTop ? "100%" : { xs: "100%", sm: 200 },
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {formatChartBucketTitle(tooltipPoint.date, granularity)}
      </Typography>
      {totalLabel != null && (
        <Typography variant="h6" fontWeight={700} sx={{ mt: 0.75, lineHeight: 1.3 }}>
          {formatNumber(totalValue)} {totalLabel}
        </Typography>
      )}
      <Stack spacing={1} sx={{ mt: 1 }}>
        {infoSeries.map((s) => {
          const value = Number(tooltipPoint[s.key] ?? 0);
          const formatted =
            s.key === "amount" || s.key === "commission"
              ? `${formatMoney(value)} تومان`
              : formatNumber(value);
          return (
            <Stack key={s.key} direction="row" alignItems="center" sx={{ gap: 1.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  bgcolor: s.color,
                  borderRadius: "50%",
                  flexShrink: 0,
                  marginInlineEnd: 0.5,
                }}
              />
              <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                {s.label}: <strong>{formatted}</strong>
              </Typography>
            </Stack>
          );
        })}
        {hideZeroSeriesInInfo && infoSeries.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            اقدامی ثبت نشده است.
          </Typography>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
        روی هر ستون کلیک کنید
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ direction: "rtl" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: infoPanelOnTop ? "column" : { xs: "column", sm: "row" },
          gap: 1.5,
          alignItems: "stretch",
        }}
      >
        {infoPanel}
        <Box ref={scrollRef} sx={{ overflowX: "auto", pb: 1, direction: "ltr", flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              minWidth: Math.max(chartData.length * 48, 280),
              height,
              px: 0.5,
            }}
          >
            {chartData.map((point) => {
              const isActive = tooltipPoint.date === point.date;
              const daySeries = hideZeroBars
                ? series.filter((s) => Number(point[s.key] ?? 0) > 0)
                : series;
              const barWidth = daySeries.length > 1 ? 10 : 20;
              return (
                <Box
                  key={point.date}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActive(point)}
                  onKeyDown={(e) => e.key === "Enter" && setActive(point)}
                  sx={{
                    flex: "1 0 40px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                    cursor: "pointer",
                    opacity: isActive ? 1 : 0.75,
                    outline: "none",
                    "&:focus-visible": { opacity: 1 },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.25}
                    alignItems="flex-end"
                    justifyContent="center"
                    sx={{ height: height - 36, minWidth: 20 }}
                  >
                    {daySeries.length === 0 ? (
                      <Box
                        sx={{
                          width: 20,
                          height: 4,
                          bgcolor: "action.disabledBackground",
                          borderRadius: 0.5,
                        }}
                      />
                    ) : (
                      daySeries.map((s) => {
                        const value = Number(point[s.key] ?? 0);
                        const barHeight = Math.max(4, (value / maxValue) * (height - 48));
                        return (
                          <Box
                            key={s.key}
                            sx={{
                              width: barWidth,
                              height: barHeight,
                              bgcolor: s.color,
                              borderRadius: 0.5,
                              transition: "height 0.2s ease, opacity 0.15s",
                              boxShadow: isActive ? 2 : 0,
                            }}
                          />
                        );
                      })
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    color={isActive ? "primary.main" : "text.secondary"}
                    sx={{
                      fontSize: granularity === "month" ? "0.6rem" : "0.65rem",
                      fontWeight: isActive ? 700 : 400,
                      textAlign: "center",
                      lineHeight: 1.2,
                      maxWidth: 56,
                    }}
                  >
                    {formatChartBucketLabel(point.date, granularity)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
      <Stack
        direction="row"
        spacing={2.5}
        flexWrap="wrap"
        useFlexGap
        sx={{ mt: 1.5, px: 0.5, rowGap: 1 }}
      >
        {series.map((s) => (
          <Stack
            key={s.key}
            direction="row"
            alignItems="center"
            sx={{ gap: 1, pr: { xs: 2, sm: 2.5 } }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                bgcolor: s.color,
                borderRadius: "50%",
                flexShrink: 0,
                marginInlineEnd: 0.5,
              }}
            />
            <Typography variant="caption">{s.label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
