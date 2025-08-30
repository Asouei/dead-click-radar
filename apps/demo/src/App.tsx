import React, { useState, useEffect, useRef } from 'react';
import { DeadClickRadar } from '../../../packages/core/src/index';
import type { DeadClickReport, DeadClickHotspot } from '../../../packages/core/src/types';
import ReportViewer from './components/ReportViewer';
import './App.css';

function App() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [report, setReport] = useState<DeadClickReport | null>(null);
    const [currentTab, setCurrentTab] = useState<'demo' | 'viewer'>('demo');
    const radarRef = useRef<DeadClickRadar | null>(null);

    useEffect(() => {
        if (isEnabled && !radarRef.current) {
            radarRef.current = new DeadClickRadar({
                heatmapAlpha: 0.4,
                observationWindowMs: 600,
                onReportUpdate: (newReport) => setReport(newReport),
                autoStart: false
            });
            radarRef.current.start();
        } else if (!isEnabled && radarRef.current) {
            radarRef.current.stop();
            radarRef.current.destroy();
            radarRef.current = null;
            setReport(null);
        }

        return () => {
            if (radarRef.current) {
                radarRef.current.destroy();
                radarRef.current = null;
            }
        };
    }, [isEnabled]);

    const handleExportJSON = () => {
        if (!radarRef.current) return;

        const jsonData = radarRef.current.exportJSON(true);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `dead-click-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportPNG = (fullPage = false) => {
        if (!radarRef.current) return;

        const dataURL = fullPage
            ? radarRef.current.exportFullPagePNG()
            : radarRef.current.exportPNG();
        const filename = `dead-click-heatmap${fullPage ? '-fullpage' : ''}-${Date.now()}.png`;

        const a = document.createElement('a');
        a.href = dataURL;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleClearData = () => {
        if (!radarRef.current) return;
        radarRef.current.clear();
        setReport(null);
    };

    const getDeadClickPercentage = () => {
        if (!report || report.totalClicks === 0) return 0;
        return Math.round((report.deadClicks / report.totalClicks) * 100);
    };

    return (
        <div className="app">
            <header className="header">
                <div className="header-content">
                    <h1>Dead-Click Radar</h1>
                    <p className="tagline">Catch dead clicks. Fix UX before users rage.</p>

                    <nav className="tabs">
                        <button
                            className={currentTab === 'demo' ? 'tab active' : 'tab'}
                            onClick={() => setCurrentTab('demo')}
                        >
                            Live Demo
                        </button>
                        <button
                            className={currentTab === 'viewer' ? 'tab active' : 'tab'}
                            onClick={() => setCurrentTab('viewer')}
                        >
                            Report Viewer
                        </button>
                    </nav>
                </div>
            </header>

            {currentTab === 'demo' && (
                <main className="demo-content">
                    <div className="controls">
                        <div className="control-group">
                            <button
                                className={`toggle-btn ${isEnabled ? 'active' : ''}`}
                                onClick={() => setIsEnabled(!isEnabled)}
                            >
                                {isEnabled ? 'Disable Radar' : 'Enable Radar'}
                            </button>

                            {isEnabled && (
                                <>
                                    <button onClick={handleExportJSON} disabled={!report}>
                                        Export JSON
                                    </button>
                                    <button onClick={() => handleExportPNG(false)} disabled={!report}>
                                        Export PNG (Viewport)
                                    </button>
                                    <button onClick={() => handleExportPNG(true)} disabled={!report}>
                                        Export PNG (Full Page)
                                    </button>
                                    <button onClick={handleClearData} disabled={!report}>
                                        Clear Data
                                    </button>
                                </>
                            )}
                        </div>

                        {isEnabled && report && (
                            <div className="stats">
                                <div className="stat">
                                    <span className="stat-value">{report.totalClicks}</span>
                                    <span className="stat-label">Total Clicks</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{report.deadClicks}</span>
                                    <span className="stat-label">Dead Clicks</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{getDeadClickPercentage()}%</span>
                                    <span className="stat-label">Dead Rate</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <section className="playground">
                        <h2>Test Interface</h2>
                        <p>Click elements below to see dead-click detection in action:</p>

                        <div className="test-grid">
                            {/* Рабочие интерактивные элементы */}
                            <button
                                className="test-element working"
                                onClick={() => alert('This button works!')}
                            >
                                Working Button
                            </button>

                            <a
                                href="#working-link"
                                className="test-element working"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert('This link works!');
                                }}
                            >
                                Working Link
                            </a>

                            {/* Элементы-пустышки для демонстрации dead clicks */}
                            <div className="test-element broken">
                                Broken Button
                                <small>Выглядит как кнопка, но ничего не делает</small>
                            </div>

                            <div className="test-element broken">
                                Fake Link
                                <small>Похож на ссылку, но это просто div</small>
                            </div>

                            <div className="test-element semi-broken" onClick={() => {
                                // Имитируем медленную реакцию - слишком поздно для detection window
                                setTimeout(() => {
                                    console.log('Too slow response');
                                }, 800);
                            }}>
                                Slow Response
                                <small>Реагирует слишком медленно</small>
                            </div>

                            <div className="test-element card">
                                Product Card
                                <p>Кликабельная карточка без обработчика</p>
                                <span className="price">$29.99</span>
                            </div>

                            <div className="test-element interactive-looking">
                                <span className="icon">▶</span>
                                Play Button Look-alike
                                <small>Выглядит интерактивно, но это обман</small>
                            </div>

                            <button className="test-element network-button" onClick={async () => {
                                // Этот клик вызывает сетевой запрос, поэтому не должен считаться dead
                                await fetch('/api/fake-endpoint').catch(() => {});
                                alert('Network request sent!');
                            }}>
                                Network Request Button
                            </button>
                        </div>

                        {isEnabled && report && report.hotspots.length > 0 && (
                            <div className="hotspots">
                                <h3>Top Dead Click Hotspots:</h3>
                                <div className="hotspots-list">
                                    {report.hotspots.slice(0, 5).map((hotspot: DeadClickHotspot, index: number) => (
                                        <div key={index} className="hotspot">
                                            <code className="selector">{hotspot.selector}</code>
                                            <span className="count">{hotspot.count} клик(ов)</span>
                                            {hotspot.sampleText && (
                                                <span className="text">"{hotspot.sampleText}"</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="instructions">
                        <h2>How to Use</h2>
                        <ol>
                            <li>Click "Enable Radar" to start tracking</li>
                            <li>Try clicking the elements above</li>
                            <li>Watch red dots appear on "broken" elements</li>
                            <li>Export data as JSON or PNG heatmap</li>
                        </ol>

                        <h3>Integration</h3>
                        <pre><code>{`npm install @asouei/dead-click-radar

import { DeadClickRadar } from '@asouei/dead-click-radar';

const radar = new DeadClickRadar({
  observationWindowMs: 500,
  onDeadClick: (event) => console.log('Dead click:', event)
});
radar.start();`}</code></pre>
                    </section>
                </main>
            )}

            {currentTab === 'viewer' && (
                <ReportViewer />
            )}
        </div>
    );
}

export default App;