"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
} from "@/app/hooks";

import { useCallTool } from "@/app/hooks/use-call-tool";

interface TokenInfo {
  name: string;
  address: string;
  decimals: number;
}

interface ActiveWaveInfo {
  openedAt: string;
  startedAt: string;
  submissionDeadline: string;
  judgementDeadline: string;
  grantAmount?: string;
}

interface CommunityLinks {
  websiteUrl?: string;
  discordUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}

interface JudgingCriterion {
  id: string;
  title: string;
  sort: number;
  isActive: boolean;
}

interface WaveCuteDetail {
  id: string;
  title: string;
  description?: string;
  buildingDays?: number;
  judgingDays?: number;
  activeWave: ActiveWaveInfo;
  grantDenomination?: TokenInfo;
  community?: CommunityLinks;
  criteria?: JudgingCriterion[];
}

interface WaveCuteApiResponse {
  success: boolean;
  data?: WaveCuteDetail;
  error?: string;
}

const COMMUNITY_CONFIG = [
  {
    key: "websiteUrl" as const,
    icon: "🌐",
    label: "Website",
  },
  {
    key: "discordUrl" as const,
    icon: "💬",
    label: "Discord",
  },
  {
    key: "twitterUrl" as const,
    icon: "🐦",
    label: "Twitter / X",
  },
  {
    key: "telegramUrl" as const,
    icon: "📱",
    label: "Telegram",
  },
];

const formatDate = (value?: string) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

const getTimeRemaining = (deadline?: string) => {
  if (!deadline) {
    return { label: "No deadline provided", variant: "neutral" as const };
  }

  const now = Date.now();
  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (Number.isNaN(target)) {
    return { label: "Invalid deadline", variant: "neutral" as const };
  }

  if (diff <= 0) {
    return { label: "Deadline passed", variant: "expired" as const };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const variant =
    days <= 1 ? "urgent" : days <= 3 ? "soon" : days <= 7 ? "warning" : "good";

  return {
    label: `${days}d ${hours}h ${minutes}m remaining`,
    variant,
  };
};

const TIMELINE_FIELDS = [
  { key: "openedAt", label: "Opened" },
  { key: "startedAt", label: "Started" },
  { key: "submissionDeadline", label: "Submission Deadline" },
  { key: "judgementDeadline", label: "Judging Deadline" },
] as const;

const getBadgeStyles = (variant: ReturnType<typeof getTimeRemaining>["variant"]) => {
  switch (variant) {
    case "expired":
      return "bg-rose-100/80 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200";
    case "urgent":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
    case "soon":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
    case "warning":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200";
    case "good":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
};

export default function ViewWaveCuteDetailPage() {
  const widgetProps = useWidgetProps<{ id?: string }>();
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();
  const callTool = useCallTool();

  const [waveCute, setWaveCute] = useState<WaveCuteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waveCuteId = widgetProps?.id ?? "";

  useEffect(() => {
    let cancelled = false;

    const fetchWaveCuteDetail = async () => {
      if (!waveCuteId) {
        setError("Wave Cute ID is required to view details.");
        return;
      }

      setLoading(true);
      setError(null);
      setWaveCute(null);

      try {
        const response = await fetch(`/api/wave-hack/${waveCuteId}`);
        const payload: WaveCuteApiResponse = await response.json();

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(
            payload.error || "Unable to load Wave Cute detail from API."
          );
        }

        if (!cancelled) {
          setWaveCute(payload.data);
        }
      } catch (apiError) {
        // Fall back to MCP tool if direct fetch fails (e.g., hosted via MCP only)
        try {
          const toolResult = await callTool("fetch_wave_cute", { id: waveCuteId });

          if (cancelled || toolResult == null) {
            throw apiError;
          }

          const parsed = JSON.parse(toolResult.result as string);
          if (!parsed?.success || !parsed?.data) {
            throw apiError;
          }

          setWaveCute(parsed.data as WaveCuteDetail);
        } catch (fallbackError) {
          if (!cancelled) {
            setError(
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unable to load Wave Cute detail."
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchWaveCuteDetail();

    return () => {
      cancelled = true;
    };
  }, [waveCuteId, callTool]);

  const timeRemainingBadge = useMemo(() => {
    if (!waveCute?.activeWave?.submissionDeadline) {
      return null;
    }
    return getTimeRemaining(waveCute.activeWave.submissionDeadline);
  }, [waveCute?.activeWave?.submissionDeadline]);

  const communityLinks = useMemo(() => {
    if (!waveCute?.community) return [];

    return COMMUNITY_CONFIG.filter(({ key }) => waveCute.community?.[key]).map(
      ({ key, icon, label }) => ({
        key,
        icon,
        label,
        url: waveCute.community?.[key as keyof CommunityLinks] ?? "",
      })
    );
  }, [waveCute?.community]);

  const criteriaList = useMemo(() => {
    if (!waveCute?.criteria?.length) return [];
    return [...waveCute.criteria]
      .filter((criterion) => criterion.isActive)
      .sort((a, b) => a.sort - b.sort);
  }, [waveCute?.criteria]);

  return (
    <div
      className="font-sans bg-gradient-to-br from-slate-50 via-cyan-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5"
      style={{
        maxHeight: maxHeight ? `${maxHeight}px` : "100vh",
        height:
          displayMode === "fullscreen"
            ? maxHeight
              ? `${maxHeight}px`
              : "100vh"
            : "auto",
        minHeight: maxHeight ? `${maxHeight}px` : "100vh",
        overflow: "auto",
      }}
    >
      {displayMode !== "fullscreen" && (
        <button
          aria-label="Enter fullscreen"
          className="fixed top-4 right-4 z-50 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          onClick={() => requestDisplayMode("fullscreen")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>
      )}

      {!isChatGptApp && (
        <div className="bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-lg px-4 py-3 mb-6 max-w-4xl mx-auto">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zM10 13a1 1 0 110 2 1 1 0 010-2z"
                clipRule="evenodd"
              />
            </svg>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Tip
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Use the fullscreen button for a richer experience, then click
                any community links to dive deeper into this Wave Cute.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Wave Cute Detail
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {waveCute?.title ?? "Wave Cute Viewer"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ID: <span className="font-mono text-slate-700 dark:text-slate-200">{waveCuteId || "—"}</span>
          </p>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-sky-600"></div>
            <p className="mt-6 text-slate-700 dark:text-slate-300">
              Fetching Wave Cute details…
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="max-w-3xl mx-auto bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg p-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 text-rose-600 dark:text-rose-300 text-xl">
                ❌
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-200">
                  Unable to load details
                </h2>
                <p className="text-sm text-rose-600 dark:text-rose-300">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && waveCute && (
          <section className="bg-white dark:bg-slate-900/70 shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10 rounded-2xl p-6 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-2">
                <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                  Active Wave
                  <span className="inline-flex items-center gap-1 font-normal text-slate-500 dark:text-slate-300">
                    🕒 {formatDate(waveCute.activeWave?.startedAt)}
                  </span>
                </p>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {waveCute.title}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Stay on top of deadlines, prize info, and judging criteria.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                {timeRemainingBadge && (
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${getBadgeStyles(
                      timeRemainingBadge.variant
                    )}`}
                  >
                    {timeRemainingBadge.label}
                  </span>
                )}
                <a
                  href={`https://app.akindo.io/wave-hacks/${waveCute.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium transition-colors"
                >
                  Visit on Akindo
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14M12 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="relative overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800/80 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Build & Judging Window
                  </h3>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Timeline overview
                  </span>
                </div>
                <dl className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <dt className="font-medium">Building Phase</dt>
                    <dd>{waveCute.buildingDays ?? "—"} days</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Judging Phase</dt>
                    <dd>{waveCute.judgingDays ?? "—"} days</dd>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    {TIMELINE_FIELDS.map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex justify-between gap-4 text-xs"
                      >
                        <span className="text-slate-500 dark:text-slate-400">
                          {label}
                        </span>
                        <span className="text-right font-medium text-slate-700 dark:text-slate-200">
                          {formatDate(
                            waveCute.activeWave?.[
                              key as keyof ActiveWaveInfo
                            ]
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </dl>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                  Prize Pool
                </h3>
                {waveCute.grantDenomination?.name &&
                waveCute.activeWave?.grantAmount ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {parseFloat(
                        waveCute.activeWave.grantAmount
                      ).toLocaleString("en-US")}{" "}
                      {waveCute.grantDenomination.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Token Address:{" "}
                      <span className="font-mono text-slate-600 dark:text-slate-300 break-all">
                        {waveCute.grantDenomination.address}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Decimals: {waveCute.grantDenomination.decimals}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Prize information is not available for this Wave Cute.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                Description
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700 p-5 max-h-72 overflow-y-auto text-sm text-slate-700 dark:text-slate-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-md font-semibold mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mb-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    a: ({ href, children }) => (
                      <a
                        href={href ?? "#"}
                        className="text-sky-600 hover:text-sky-800 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc ml-4 mb-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal ml-4 mb-2">{children}</ol>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-slate-300 pl-4 italic mb-2">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-slate-200 dark:bg-slate-700 p-2 rounded overflow-x-auto mb-2 text-xs">
                        {children}
                      </pre>
                    ),
                    img: ({ src, alt }) =>
                      src ? (
                        <img
                          src={src}
                          alt={alt ?? ""}
                          className="max-w-full h-auto rounded mb-2"
                        />
                      ) : null,
                    iframe: ({ src, width, height }) =>
                      src ? (
                        <iframe
                          src={src}
                          width={width ?? "100%"}
                          height={height ?? "315"}
                          className="w-full rounded mb-2"
                          allowFullScreen
                        />
                      ) : null,
                  }}
                >
                  {waveCute.description ?? "No description available for this Wave Cute."}
                </ReactMarkdown>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Community Links
              </h3>
              {communityLinks.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {communityLinks.map(({ key, icon, label, url }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="flex-shrink-0 w-6 h-6 mr-3 text-lg">
                        {icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {url}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No community links have been provided.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Judging Criteria
              </h3>
              {criteriaList.length > 0 ? (
                <div className="space-y-3">
                  {criteriaList.map((criterion) => (
                    <div
                      key={criterion.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/80 px-4 py-3"
                    >
                      <span className="text-sm text-slate-800 dark:text-slate-100">
                        {criterion.title}
                      </span>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200">
                        #{criterion.sort}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Judging criteria will be announced soon.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
