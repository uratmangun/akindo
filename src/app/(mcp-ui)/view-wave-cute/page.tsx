"use client";

import { useState, useEffect } from "react";
import {
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
} from "@/app/hooks";
import { useCallTool } from "@/app/hooks/use-call-tool";

interface Token {
  name: string;
  address: string;
  decimals: number;
}

interface ActiveWave {
  openedAt: string;
  startedAt: string;
  submissionDeadline: string;
  judgementDeadline: string;
  grantAmount: string;
}

interface WaveHack {
  id: string;
  title: string;
  isPublic: boolean;
  buildingDays: number;
  judgingDays: number;
  activeWave: ActiveWave;
  grantDenomination: Token;
}

interface WaveHacksData {
  success: boolean;
  data: WaveHack[];
  summary: any;
  timestamp: string;
  error?: string;
}

export default function ViewWaveHacksPage() {
  const toolOutput = useWidgetProps<{
    mode?: string;
    page?: number;
    activeOnly?: boolean;
  }>();
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();
  const callTool = useCallTool();

  const [waveHacksData, setWaveHacksData] = useState<WaveHacksData | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock ticking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadWaveHacks = async () => {
      setLoading(true);

      try {
        const params = {
          mode: toolOutput?.mode || "all",
          page: toolOutput?.page,
          activeOnly: toolOutput?.activeOnly ?? true,
        };

        const result = await callTool("fetch_akindo_data", params);
        
        if (result == null) {
          setStatusMessage("Tool call unavailable outside ChatGPT");
          return;
        }

        const data = JSON.parse(result.result);
        
        if (data.error) {
          setStatusMessage(data.error);
          return;
        }

        setWaveHacksData(data);
      } catch (error: any) {
        setStatusMessage(error?.message || "Error loading wave hacks data");
      } finally {
        setLoading(false);
      }
    };

    loadWaveHacks();
  }, [toolOutput?.mode, toolOutput?.page, toolOutput?.activeOnly, callTool]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
  };

  const calculateTimeRemaining = (deadline: string) => {
    const now = currentTime;
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds, isExpired: false };
  };

  const getProgressBarColor = (timeRemaining: ReturnType<typeof calculateTimeRemaining>) => {
    if (timeRemaining.isExpired) return 'bg-red-500';
    if (timeRemaining.days <= 1) return 'bg-red-500';
    if (timeRemaining.days <= 3) return 'bg-orange-500';
    if (timeRemaining.days <= 7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const sortedWaveHacks = waveHacksData?.data ? [...waveHacksData.data].sort((a, b) => {
    const now = new Date().getTime();
    const deadlineA = new Date(a.activeWave.submissionDeadline).getTime();
    const deadlineB = new Date(b.activeWave.submissionDeadline).getTime();
    
    const isExpiredA = deadlineA <= now;
    const isExpiredB = deadlineB <= now;
    
    if (isExpiredA && !isExpiredB) return 1;
    if (!isExpiredA && isExpiredB) return -1;
    
    return deadlineA - deadlineB;
  }) : [];

  return (
    <div
      className="font-sans bg-slate-50 dark:bg-slate-950 p-4"
      style={{
        maxHeight: maxHeight ? `${maxHeight}px` : "100vh",
        height: displayMode === "fullscreen" ? (maxHeight ? `${maxHeight}px` : "100vh") : "auto",
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
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 mb-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
              This viewer is designed to work within ChatGPT. Some features may not work outside of ChatGPT.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {loading ? (
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-6">
              <svg className="h-5 w-5 animate-spin text-slate-400" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
              <span className="text-sm">Loading wave hacks data...</span>
            </div>
            <div className="space-y-3">
              <div className="h-8 w-1/2 rounded bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
              <div className="h-20 rounded bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
            </div>
          </section>
        ) : statusMessage && !waveHacksData ? (
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-8">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-slate-600 dark:text-slate-300">{statusMessage}</p>
            </div>
          </section>
        ) : waveHacksData ? (
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Active Wave Hacks
              </h2>
              {waveHacksData.summary && (
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p>Total Items: {waveHacksData.summary.totalItems || waveHacksData.data.length}</p>
                  {waveHacksData.summary.activeOnly !== undefined && (
                    <p>Filter: {waveHacksData.summary.activeOnly ? 'Active waves only' : 'All waves'}</p>
                  )}
                </div>
              )}
            </div>

            {sortedWaveHacks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <p className="text-sm">No wave hacks found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedWaveHacks.map((hack) => {
                  const timeRemaining = calculateTimeRemaining(hack.activeWave.submissionDeadline);
                  const progressColor = getProgressBarColor(timeRemaining);
                  const judgingTimeRemaining = calculateTimeRemaining(hack.activeWave.judgementDeadline);
                  const judgingProgressColor = getProgressBarColor(judgingTimeRemaining);
                  
                  return (
                    <div 
                      key={hack.id} 
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-6 hover:shadow-lg transition-shadow hover:border-cyan-300 dark:hover:border-cyan-500"
                    >
                      {/* ID and Title */}
                      <div className="mb-4">
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                          {hack.id}
                        </div>
                        <a 
                          href={`https://app.akindo.io/wave-hacks/${hack.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">
                            {hack.title}
                          </h3>
                        </a>
                      </div>

                      {/* Duration */}
                      <div className="mb-4">
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span className="font-medium">Building:</span>
                            <span>{hack.buildingDays} days</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="font-medium">Judging:</span>
                            <span>{hack.judgingDays} days</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bars */}
                      <div className="mb-4 space-y-3">
                        {/* Submission Deadline Progress Bar */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Submission
                            </span>
                            <span className={`text-sm font-medium ${
                              timeRemaining.isExpired 
                                ? 'text-red-600 dark:text-red-400' 
                                : timeRemaining.days <= 1 
                                ? 'text-red-600 dark:text-red-400'
                                : timeRemaining.days <= 3
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {timeRemaining.isExpired 
                                ? 'Expired' 
                                : `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s`
                              }
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                              style={{
                                width: timeRemaining.isExpired ? '100%' : `${Math.max(5, 100 - (timeRemaining.days * 3.33))}%`
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Judging Deadline Progress Bar */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Judging
                            </span>
                            <span className={`text-sm font-medium ${
                              judgingTimeRemaining.isExpired 
                                ? 'text-red-600 dark:text-red-400' 
                                : judgingTimeRemaining.days <= 1 
                                ? 'text-red-600 dark:text-red-400'
                                : judgingTimeRemaining.days <= 3
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {judgingTimeRemaining.isExpired 
                                ? 'Expired' 
                                : `${judgingTimeRemaining.days}d ${judgingTimeRemaining.hours}h ${judgingTimeRemaining.minutes}m ${judgingTimeRemaining.seconds}s`
                              }
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${judgingProgressColor} opacity-75`}
                              style={{
                                width: judgingTimeRemaining.isExpired ? '100%' : `${Math.max(5, 100 - (judgingTimeRemaining.days * 3.33))}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="mb-4 space-y-1 text-xs">
                        <div className="text-slate-700 dark:text-slate-300">
                          <span className="font-medium">Opened:</span> {formatDate(hack.activeWave.openedAt)}
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">
                          <span className="font-medium">Deadline:</span> {formatDate(hack.activeWave.submissionDeadline)}
                        </div>
                      </div>

                      {/* Token */}
                      <div className="mb-4">
                        {hack.grantDenomination && hack.activeWave?.grantAmount ? (
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {parseFloat(hack.activeWave.grantAmount).toLocaleString()} {hack.grantDenomination.name}
                            </div>
                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                              {hack.grantDenomination.address}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">N/A</div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          hack.isPublic 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {hack.isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
