import React, { useState, useRef } from 'react';
import type { DeadClickReport } from '../../../../packages/core/src/types.js';

interface ViewerState {
    report: DeadClickReport | null;
    error: string | null;
}

const ReportViewer: React.FC = () => {
    const [state, setState] = useState<ViewerState>({ report: null, error: null });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = e.target?.result as string;
                const report = JSON.parse(jsonData) as DeadClickReport;

                // Базовая валидация структуры отчета
                if (!report.sessionId || !report.page || typeof report.deadClicks !== 'number') {
                    throw new Error('Некорректная структура отчета');
                }

                setState({ report, error: null });
            } catch (err) {
                setState({
                    report: null,
                    error: `Ошибка загрузки файла: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`
                });
            }
        };

        reader.readAsText(file);
    };

    const getDeadClickPercentage = () => {
        if (!state.report || state.report.totalClicks === 0) return 0;
        return Math.round((state.report.deadClicks / state.report.totalClicks) * 100);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('ru-RU');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Скопировано в буфер обмена!');
        });
    };

    const exportCSV = () => {
        if (!state.report) return;

        const headers = ['Selector', 'Count', 'Sample Text', 'Percentage'];
        const rows = state.report.hotspots.map(hotspot => [
            hotspot.selector,
            hotspot.count.toString(),
            hotspot.sampleText || '',
            `${Math.round((hotspot.count / state.report!.deadClicks) * 100)}%`
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `dead-clicks-hotspots-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="report-viewer">
            <div className="upload-section">
                <h2>Upload Dead-Click Report</h2>
                <p>Upload a JSON file exported from Dead-Click Radar to analyze the results:</p>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />

                <button
                    className="upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Choose JSON File
                </button>

                {state.error && (
                    <div className="error">
                        <strong>Error:</strong> {state.error}
                    </div>
                )}
            </div>

            {state.report && (
                <div className="report-content">
                    <div className="report-header">
                        <h3>Report Summary</h3>
                        <div className="actions">
                            <button onClick={() => copyToClipboard(JSON.stringify(state.report, null, 2))}>
                                Copy JSON
                            </button>
                            <button onClick={exportCSV}>
                                Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="summary-cards">
                        <div className="summary-card">
                            <span className="summary-value">{state.report.totalClicks}</span>
                            <span className="summary-label">Total Clicks</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-value">{state.report.deadClicks}</span>
                            <span className="summary-label">Dead Clicks</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-value">{getDeadClickPercentage()}%</span>
                            <span className="summary-label">Dead Rate</span>
                        </div>
                    </div>

                    <div className="report-details">
                        <div className="detail-row">
                            <span className="detail-label">Page:</span>
                            <span className="detail-value">
                <a href={state.report.page} target="_blank" rel="noopener noreferrer">
                  {state.report.page}
                </a>
              </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Session ID:</span>
                            <span className="detail-value">{state.report.sessionId}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Collected:</span>
                            <span className="detail-value">{formatDate(state.report.ts)}</span>
                        </div>
                        {state.report.viewport && (
                            <div className="detail-row">
                                <span className="detail-label">Viewport:</span>
                                <span className="detail-value">
                  {state.report.viewport.w} × {state.report.viewport.h}
                </span>
                            </div>
                        )}
                    </div>

                    {state.report.hotspots.length > 0 && (
                        <div className="hotspots-table">
                            <h4>Dead-Click Hotspots</h4>
                            <div className="table-container">
                                <table>
                                    <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Selector</th>
                                        <th>Clicks</th>
                                        <th>% of Dead</th>
                                        <th>Sample Text</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {state.report.hotspots.map((hotspot, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <code className="selector-code">{hotspot.selector}</code>
                                            </td>
                                            <td className="count-cell">{hotspot.count}</td>
                                            <td className="percentage-cell">
                                                {Math.round((hotspot.count / state.report!.deadClicks) * 100)}%
                                            </td>
                                            <td className="text-cell">
                                                {hotspot.sampleText && (
                                                    <span className="sample-text">"{hotspot.sampleText}"</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {state.report.events.length > 0 && (
                        <div className="events-section">
                            <h4>Recent Dead-Click Events</h4>
                            <div className="events-list">
                                {state.report.events.slice(-20).reverse().map((event, index) => (
                                    <div key={index} className="event">
                                        <div className="event-selector">
                                            <code>{event.selector}</code>
                                        </div>
                                        <div className="event-details">
                                            <span className="event-position">({event.x}, {event.y})</span>
                                            <span className="event-time">{formatDate(event.ts)}</span>
                                        </div>
                                        {event.text && (
                                            <div className="event-text">"{event.text}"</div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {state.report.events.length > 20 && (
                                <p className="events-note">
                                    Показаны последние 20 событий из {state.report.events.length}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {!state.report && !state.error && (
                <div className="empty-state">
                    <p>No report loaded. Upload a JSON file to get started.</p>
                </div>
            )}
        </div>
    );
};

export default ReportViewer;