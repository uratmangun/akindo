'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sdk } from '@farcaster/miniapp-sdk'
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

interface Criteria {
  id: string;
  title: string;
  sort: number;
  isActive: boolean;
}

interface Community {
  websiteUrl?: string;
  discordUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}

interface WaveHackDetail {
  id: string;
  title: string;
  description: string;
  community: Community;
  criteria: Criteria[];
}

interface ApiResponse {
  success: boolean;
  data: any; // Can be array or object depending on API response
  summary: any;
  timestamp: string;
  error?: string;
}

export default function Home() {
  const [waveHacks, setWaveHacks] = useState<WaveHack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWaveHack, setSelectedWaveHack] = useState<WaveHackDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  useEffect(() => {
    const initializeSdk = async () => {
      await sdk.actions.ready();
    };
    initializeSdk();
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/akindo-data?single=true');
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          // Handle both single page and all pages response formats
          let dataArray = result.data;
          
          // If data is not an array, it might be a single page response object
          if (!Array.isArray(dataArray)) {
            // Check if it's a single page response with data/items property
            if (dataArray && (dataArray.data || dataArray.items)) {
              dataArray = dataArray.data || dataArray.items;
            } else if (dataArray) {
              // If it's a single object, wrap it in an array
              dataArray = [dataArray];
            } else {
              dataArray = [];
            }
          }
          
          // Filter data to only show items with activeWave
          const filteredData = Array.isArray(dataArray) 
            ? dataArray.filter(item => item && item.activeWave)
            : [];
          
          setWaveHacks(filteredData);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError('Error fetching data: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const fetchWaveHackDetail = async (id: string) => {
    setModalLoading(true);
    setModalError(null);
    setModalOpen(true); // Open modal immediately to show loading state
    try {
      const response = await fetch(`/api/wave-hack/${id}`);
      const result = await response.json();
      
      console.log('API Response:', result); // Debug log
      
      if (result.success) {
        console.log('Wave hack data:', result.data); // Debug log
        setSelectedWaveHack(result.data);
      } else {
        setModalError(result.error || 'Failed to fetch wave hack details');
      }
    } catch (err) {
      console.error('Fetch error:', err); // Debug log
      setModalError('Error fetching wave hack details: ' + (err as Error).message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRowClick = (id: string) => {
    fetchWaveHackDetail(id);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedWaveHack(null);
    setModalError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">
            akindo wavehacks
          </h1>
        </header>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading wave hacks data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && waveHacks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-600 dark:text-slate-400">No active wave hacks found.</p>
          </div>
        )}

        {!loading && !error && waveHacks.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-cyan-600 dark:bg-cyan-700">
              <h2 className="text-xl font-semibold text-white">Active Wave Hacks</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {waveHacks.map((hack) => (
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

                    {/* Dates */}
                    <div className="mb-4 space-y-1">
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Opened:</span> {formatDate(hack.activeWave.openedAt)}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Started:</span> {formatDate(hack.activeWave.startedAt)}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Deadline:</span> {formatDate(hack.activeWave.submissionDeadline)}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Judging:</span> {formatDate(hack.activeWave.judgementDeadline)}
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

                    {/* Status and Button */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        hack.isPublic 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {hack.isPublic ? 'Public' : 'Private'}
                      </span>
                      <button
                        onClick={() => handleRowClick(hack.id)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
              {/* Background overlay */}
              <div 
                className="fixed inset-0 transition-opacity"
                onClick={closeModal}
              ></div>

              {/* Modal panel */}
              <div className="relative w-full max-w-4xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-slate-800 shadow-xl rounded-lg z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                    Wave Hack Details
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {modalLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Loading details...</p>
                  </div>
                )}

                {modalError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">❌</div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">{modalError}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedWaveHack && !modalLoading && !modalError && (
                  <div className="space-y-6">
                    {/* Wave Hack Information */}
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Wave Hack Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                        {/* Duration */}
                        <div>
                          <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Duration</h5>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                              <span>Building:</span>
                              <span className="font-medium">{waveHacks.find(h => h.id === selectedWaveHack.id)?.buildingDays || 'N/A'} days</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                              <span>Judging:</span>
                              <span className="font-medium">{waveHacks.find(h => h.id === selectedWaveHack.id)?.judgingDays || 'N/A'} days</span>
                            </div>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div>
                          <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Timeline</h5>
                          <div className="space-y-1">
                            {(() => {
                              const hack = waveHacks.find(h => h.id === selectedWaveHack.id);
                              if (!hack) return null;
                              return (
                                <>
                                  <div className="text-sm text-slate-700 dark:text-slate-300">
                                    <span className="font-medium">Opened:</span> {formatDate(hack.activeWave.openedAt)}
                                  </div>
                                  <div className="text-sm text-slate-700 dark:text-slate-300">
                                    <span className="font-medium">Started:</span> {formatDate(hack.activeWave.startedAt)}
                                  </div>
                                  <div className="text-sm text-slate-700 dark:text-slate-300">
                                    <span className="font-medium">Deadline:</span> {formatDate(hack.activeWave.submissionDeadline)}
                                  </div>
                                  <div className="text-sm text-slate-700 dark:text-slate-300">
                                    <span className="font-medium">Judging:</span> {formatDate(hack.activeWave.judgementDeadline)}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Prize Information */}
                        <div className="md:col-span-2">
                          <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Prize</h5>
                          {(() => {
                            const hack = waveHacks.find(h => h.id === selectedWaveHack.id);
                            if (!hack) return null;
                            return hack.grantDenomination && hack.activeWave?.grantAmount ? (
                              <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                  {parseFloat(hack.activeWave.grantAmount).toLocaleString()} {hack.grantDenomination.name}
                                </div>
                                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                                  Token Address: {hack.grantDenomination.address}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  Decimals: {hack.grantDenomination.decimals}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500 dark:text-slate-400">No prize information available</div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Description
                      </h4>
                      <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-4 rounded-lg max-h-60 overflow-y-auto">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-md font-bold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                            p: ({ children }) => <p className="mb-2">{children}</p>,
                            a: ({ href, children }) => (
                              <a href={href} className="text-cyan-600 hover:text-cyan-800 underline" target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            ),
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-slate-300 pl-4 italic mb-2">{children}</blockquote>
                            ),
                            code: ({ children }) => (
                              <code className="bg-slate-200 dark:bg-slate-600 px-1 py-0.5 rounded text-xs">{children}</code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-slate-200 dark:bg-slate-600 p-2 rounded overflow-x-auto mb-2">{children}</pre>
                            ),
                            img: ({ src, alt }) => (
                              <img src={src} alt={alt} className="max-w-full h-auto rounded mb-2" />
                            ),
                            iframe: ({ src, width, height }) => (
                              <iframe 
                                src={src} 
                                width={width || "100%"} 
                                height={height || "315"} 
                                className="w-full rounded mb-2"
                                allowFullScreen
                              />
                            )
                          }}
                        >
                          {selectedWaveHack.description || 'No description available'}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Community Links */}
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Community Links
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedWaveHack.community?.websiteUrl && (
                          <a
                            href={selectedWaveHack.community.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                          >
                            <div className="flex-shrink-0 w-5 h-5 mr-3">🌐</div>
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Website</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedWaveHack.community.websiteUrl}</div>
                            </div>
                          </a>
                        )}
                        
                        {selectedWaveHack.community?.discordUrl && (
                          <a
                            href={selectedWaveHack.community.discordUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                          >
                            <div className="flex-shrink-0 w-5 h-5 mr-3">💬</div>
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Discord</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedWaveHack.community.discordUrl}</div>
                            </div>
                          </a>
                        )}

                        {selectedWaveHack.community?.twitterUrl && (
                          <a
                            href={selectedWaveHack.community.twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                          >
                            <div className="flex-shrink-0 w-5 h-5 mr-3">🐦</div>
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Twitter</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedWaveHack.community.twitterUrl}</div>
                            </div>
                          </a>
                        )}

                        {selectedWaveHack.community?.telegramUrl && (
                          <a
                            href={selectedWaveHack.community.telegramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                          >
                            <div className="flex-shrink-0 w-5 h-5 mr-3">📱</div>
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Telegram</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedWaveHack.community.telegramUrl}</div>
                            </div>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Criteria */}
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Judging Criteria
                      </h4>
                      <div className="space-y-2">
                        {selectedWaveHack.criteria && selectedWaveHack.criteria.length > 0 ? (
                          selectedWaveHack.criteria
                            .filter(criterion => criterion.isActive)
                            .sort((a, b) => a.sort - b.sort)
                            .map((criterion) => (
                              <div
                                key={criterion.id}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                              >
                                <span className="text-sm text-slate-900 dark:text-slate-100">
                                  {criterion.title}
                                </span>
                                <span className="text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded-full">
                                  #{criterion.sort}
                                </span>
                              </div>
                            ))
                        ) : (
                          <div className="text-sm text-slate-500 dark:text-slate-400">No criteria available</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
