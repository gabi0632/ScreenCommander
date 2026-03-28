import { useState, useMemo, useEffect } from 'react';
import {
  useRedAlertStatus,
  useRedAlertHistory,
  useTestRedAlert,
  useRestartRedAlert,
  useAlertCities,
} from '../hooks/useRedAlert';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { useDisplays } from '../hooks/useDisplays';
import { useDismissMessage, useResendMessage } from '../hooks/useMessages';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { useToast } from '../components/ui/Toast';
import { DEFAULT_SETTINGS } from '@screen-commander/shared';
import type { AppSettings } from '@screen-commander/shared';
import './AlertsPage.css';

export default function AlertsPage() {
  const { data: status } = useRedAlertStatus();
  const { data: history, isLoading: historyLoading } = useRedAlertHistory();
  const { data: cities } = useAlertCities();
  const { data: settings } = useSettings();
  const { data: displays } = useDisplays();
  const updateSettings = useUpdateSettings();
  const testAlert = useTestRedAlert();
  const restartService = useRestartRedAlert();
  const dismissMessage = useDismissMessage();
  const resendMessage = useResendMessage();
  const { toast } = useToast();

  const [citySearch, setCitySearch] = useState('');
  const [testType, setTestType] = useState('ירי רקטות וטילים');

  const config = settings?.redAlert ?? DEFAULT_SETTINGS.redAlert;

  // Local state for styling form (avoids mutating on every keystroke)
  const [styleForm, setStyleForm] = useState(config);
  const [styleDirty, setStyleDirty] = useState(false);

  useEffect(() => {
    if (settings?.redAlert) {
      setStyleForm(settings.redAlert);
      setStyleDirty(false);
    }
  }, [settings?.redAlert]);

  const updateStyleField = <K extends keyof AppSettings['redAlert']>(key: K, value: AppSettings['redAlert'][K]) => {
    setStyleForm((prev) => ({ ...prev, [key]: value }));
    setStyleDirty(true);
  };

  const saveStyleForm = () => {
    if (!settings) return;
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    updateSettings.mutate(
      { ...merged, redAlert: { ...config, ...styleForm } },
      {
        onSuccess: () => { toast('עיצוב ההודעה נשמר', 'success'); setStyleDirty(false); },
        onError: () => toast('שגיאה בשמירה', 'error'),
      },
    );
  };

  // Immediate save for toggles and critical settings
  const updateRedAlert = (patch: Partial<AppSettings['redAlert']>) => {
    if (!settings) return;
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    updateSettings.mutate(
      { ...merged, redAlert: { ...config, ...patch } },
      {
        onSuccess: () => toast('ההגדרות נשמרו', 'success'),
        onError: () => toast('שגיאה בשמירת ההגדרות', 'error'),
      },
    );
  };

  const filteredCities = useMemo(() => {
    if (!cities) return [];
    if (!citySearch.trim()) return cities;
    const q = citySearch.trim();
    return cities.filter(
      (c) => c.name.includes(q) || c.nameEn.toLowerCase().includes(q.toLowerCase()),
    );
  }, [cities, citySearch]);

  const toggleCity = (name: string) => {
    const current = config.watchedCities;
    const next = current.includes(name)
      ? current.filter((c) => c !== name)
      : [...current, name];
    updateRedAlert({ watchedCities: next });
  };

  const handleTest = () => {
    testAlert.mutate(testType, {
      onSuccess: () => toast('התרעת מבחן נשלחה', 'success'),
      onError: () => toast('שגיאה בשליחת התרעת מבחן', 'error'),
    });
  };

  const handleRestart = () => {
    restartService.mutate(undefined, {
      onSuccess: () => toast('שירות התרעות הופעל מחדש', 'success'),
      onError: () => toast('שגיאה בהפעלת שירות התרעות', 'error'),
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('he-IL');
  };

  const statusDotClass = status?.enabled
    ? status.connected
      ? 'alerts-dot--connected'
      : 'alerts-dot--disconnected'
    : 'alerts-dot--disabled';

  const statusLabel = status?.enabled
    ? status.connected ? 'מחובר' : 'מנותק'
    : 'מושבת';

  return (
    <div className="alerts-page">
      {/* Header */}
      <div className="alerts-header">
        <div>
          <h1 className="text-h1">התרעות צבע אדום</h1>
          <p className="alerts-subtitle">ניטור התרעות פיקוד העורף בזמן אמת</p>
        </div>
        <div className="alerts-header-actions">
          <div className="alerts-test-group">
            <select
              className="alerts-test-select"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
            >
              <option value="ירי רקטות וטילים">ירי רקטות וטילים</option>
              <option value="התרעה מקדימה">התרעה מקדימה</option>
              <option value="חדירת כלי טיס עוין">חדירת כלי טיס עוין</option>
              <option value="חדירת מחבלים">חדירת מחבלים</option>
            </select>
            <Button size="sm" variant="danger" onClick={handleTest} disabled={testAlert.isPending}>
              שלח מבחן
            </Button>
          </div>
          <Button size="sm" variant="secondary" onClick={handleRestart} disabled={restartService.isPending}>
            הפעל מחדש
          </Button>
        </div>
      </div>

      {/* Status strip */}
      <div className={`alerts-status-strip ${status?.enabled ? (status.connected ? 'alerts-status-strip--ok' : 'alerts-status-strip--error') : ''}`}>
        <div className={`alerts-dot ${statusDotClass}`} />
        <span className="alerts-status-text">שירות התרעות — {statusLabel}</span>
        <div className="alerts-status-stats">
          <div className="alerts-kpi">
            <span className="alerts-kpi-value">{status?.alertCount ?? 0}</span>
            <span className="alerts-kpi-label">התרעות</span>
          </div>
          <div className="alerts-kpi-divider" />
          <div className="alerts-kpi">
            <span className="alerts-kpi-value alerts-kpi-value--small">
              {status?.lastAlertAt ? formatDate(status.lastAlertAt) : '—'}
            </span>
            <span className="alerts-kpi-label">אחרונה</span>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="alerts-grid">
        {/* LEFT: History */}
        <div className="alerts-col-main">
          <Card className="alerts-history-card">
            <div className="alerts-section-header">
              <h2 className="text-h3">היסטוריית התרעות</h2>
              <Badge variant={history && history.length > 0 ? 'red' : 'default'}>
                {history?.length ?? 0}
              </Badge>
            </div>

            {historyLoading ? (
              <div className="alerts-empty">טוען...</div>
            ) : history && history.length > 0 ? (
              <div className="alerts-history-list">
                {history.map((msg) => (
                  <div key={msg.id} className="alerts-history-item">
                    <div className="alerts-history-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="alerts-history-content">
                      <div className="alerts-history-text">{msg.text}</div>
                      <div className="alerts-history-meta">
                        <span className="text-mono">{formatDate(msg.sentAt)}</span>
                        {msg.dismissedAt && (
                          <Badge variant="default">בוטל</Badge>
                        )}
                        {!msg.dismissedAt && (
                          <Badge variant="red" pulse>פעיל</Badge>
                        )}
                      </div>
                    </div>
                    <div className="alerts-history-actions">
                      <Button size="sm" onClick={() => resendMessage.mutate(msg.id, { onSuccess: () => toast('התרעה נשלחה מחדש', 'success') })}>
                        שלח מחדש
                      </Button>
                      {!msg.dismissedAt && (
                        <Button size="sm" variant="ghost" onClick={() => dismissMessage.mutate(msg.id, { onSuccess: () => toast('התרעה בוטלה', 'info') })}>
                          בטל
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alerts-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: 12 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>אין התרעות עדיין</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>התרעות צבע אדום יופיעו כאן</div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Configuration */}
        <div className="alerts-col-side">
          {/* Enable toggle card */}
          <Card className="alerts-config-card">
            <div className="alerts-config-row">
              <div>
                <div className="alerts-config-title">הפעלת שירות</div>
                <div className="alerts-config-desc">חיבור לשירות צבע אדום בזמן אמת</div>
              </div>
              <Toggle
                label=""
                checked={config.enabled}
                onChange={(v) => updateRedAlert({ enabled: v })}
              />
            </div>
          </Card>

          {/* Cities selector */}
          <Card className="alerts-config-card">
            <div className="alerts-config-row" style={{ marginBottom: 12 }}>
              <div className="alerts-config-title">ערים לניטור</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {cities && config.watchedCities.length < (cities?.length ?? 0) && (
                  <button
                    className="alerts-city-action-btn"
                    onClick={() => {
                      if (cities) updateRedAlert({ watchedCities: cities.map((c) => c.name) });
                    }}
                  >
                    בחר הכל
                  </button>
                )}
                {config.watchedCities.length > 0 && (
                  <button
                    className="alerts-city-action-btn alerts-city-action-btn--danger"
                    onClick={() => updateRedAlert({ watchedCities: [] })}
                  >
                    נקה הכל
                  </button>
                )}
              </div>
            </div>

            {/* Selected cities */}
            {config.watchedCities.length > 0 && (
              cities && config.watchedCities.length === cities.length ? (
                <div className="alerts-all-selected">
                  <span className="alerts-all-selected-text">כל הערים נבחרו ({cities.length})</span>
                </div>
              ) : (
                <div className="alerts-selected-cities">
                  {config.watchedCities.map((city) => (
                    <button
                      key={city}
                      className="alerts-city-tag"
                      onClick={() => toggleCity(city)}
                      title="הסר"
                    >
                      {city}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  ))}
                </div>
              )
            )}

            {/* Search input */}
            <div className="alerts-city-search">
              <svg className="alerts-city-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="alerts-city-search-input"
                placeholder="חיפוש עיר..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
              />
            </div>

            {/* City list */}
            <div className="alerts-city-list">
              {filteredCities.length > 0 ? (
                filteredCities.slice(0, 80).map((city) => {
                  const selected = config.watchedCities.includes(city.name);
                  return (
                    <button
                      key={city.id}
                      className={`alerts-city-item ${selected ? 'alerts-city-item--selected' : ''}`}
                      onClick={() => toggleCity(city.name)}
                    >
                      <span className="alerts-city-name">{city.name}</span>
                      <span className="alerts-city-countdown">{city.countdown}s</span>
                      {selected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="alerts-city-empty">
                  {cities ? 'לא נמצאו ערים' : 'טוען רשימת ערים...'}
                </div>
              )}
            </div>
          </Card>

          {/* Display targets */}
          <Card className="alerts-config-card">
            <div className="alerts-config-title" style={{ marginBottom: 8 }}>מסכי יעד</div>
            <Toggle
              label="שליחה לכל המסכים"
              checked={config.targetDisplayIds === 'all'}
              onChange={(v) => updateRedAlert({ targetDisplayIds: v ? 'all' : [] })}
            />
            {config.targetDisplayIds !== 'all' && displays && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {displays.filter((d) => d.isEnabled).map((d) => {
                  const sel = Array.isArray(config.targetDisplayIds) && config.targetDisplayIds.includes(d.id);
                  return (
                    <Chip
                      key={d.id}
                      label={d.name}
                      selected={sel}
                      onClick={() => {
                        const current = Array.isArray(config.targetDisplayIds) ? config.targetDisplayIds : [];
                        updateRedAlert({
                          targetDisplayIds: sel ? current.filter((x) => x !== d.id) : [...current, d.id],
                        });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </Card>

          {/* Message styling */}
          <Card className="alerts-config-card alerts-style-card">
            <div className="alerts-config-row" style={{ marginBottom: 12 }}>
              <div className="alerts-config-title">עיצוב הודעה</div>
              {styleDirty && (
                <Button size="sm" variant="primary" onClick={saveStyleForm} disabled={updateSettings.isPending}>
                  שמור
                </Button>
              )}
            </div>

            {/* Live preview */}
            <div className="alerts-preview">
              <div
                className="alerts-preview-msg"
                style={{
                  fontSize: `${Math.min(styleForm.fontSize, 24)}px`,
                  color: styleForm.fontColor,
                  backgroundColor: styleForm.backgroundColor,
                }}
              >
                {(() => {
                  const allSelected = cities && config.watchedCities.length === cities.length;
                  const citiesText = allSelected
                    ? 'כל הערים'
                    : config.watchedCities.length > 3
                      ? `${config.watchedCities.slice(0, 3).join(', ')} +${config.watchedCities.length - 3}`
                      : config.watchedCities.join(', ') || 'צפת';
                  return styleForm.messageTemplate
                    .replace('{cities}', citiesText)
                    .replace('{type}', 'ירי רקטות וטילים');
                })()}
              </div>
            </div>

            <div className="alerts-style-form">
              {/* Template */}
              <div className="alerts-style-field">
                <label className="alerts-style-label">תבנית הודעה</label>
                <select
                  className="alerts-style-select"
                  value={styleForm.messageTemplate}
                  onChange={(e) => updateStyleField('messageTemplate', e.target.value)}
                >
                  <option value="🚨 {type}: {cities}">🚨 סוג התרעה: שמות ערים</option>
                  <option value="{type}: {cities}">סוג התרעה: שמות ערים</option>
                  <option value="🚨 צבע אדום: {cities}">🚨 צבע אדום: שמות ערים</option>
                  <option value="🚨 {cities}">🚨 שמות ערים בלבד</option>
                  <option value="{cities}">שמות ערים בלבד</option>
                </select>
              </div>

              {/* Duration + Font size */}
              <div className="alerts-style-row">
                <div className="alerts-style-field">
                  <label className="alerts-style-label">משך (שניות)</label>
                  <input
                    className="alerts-style-input alerts-style-input--num"
                    type="number"
                    min={1}
                    max={3600}
                    value={styleForm.displayDuration}
                    onChange={(e) => updateStyleField('displayDuration', parseInt(e.target.value, 10) || 120)}
                    dir="ltr"
                  />
                </div>
                <div className="alerts-style-field">
                  <label className="alerts-style-label">גודל גופן</label>
                  <input
                    className="alerts-style-input alerts-style-input--num"
                    type="number"
                    min={12}
                    max={200}
                    value={styleForm.fontSize}
                    onChange={(e) => updateStyleField('fontSize', parseInt(e.target.value, 10) || 48)}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="alerts-style-row">
                <div className="alerts-style-field">
                  <label className="alerts-style-label">צבע גופן</label>
                  <div className="alerts-color-combo">
                    <input
                      type="color"
                      className="alerts-color-swatch"
                      value={styleForm.fontColor}
                      onChange={(e) => updateStyleField('fontColor', e.target.value)}
                    />
                    <input
                      className="alerts-style-input alerts-style-input--hex"
                      value={styleForm.fontColor}
                      onChange={(e) => updateStyleField('fontColor', e.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="alerts-style-field">
                  <label className="alerts-style-label">צבע רקע</label>
                  <div className="alerts-color-combo">
                    <input
                      type="color"
                      className="alerts-color-swatch"
                      value={styleForm.backgroundColor}
                      onChange={(e) => updateStyleField('backgroundColor', e.target.value)}
                    />
                    <input
                      className="alerts-style-input alerts-style-input--hex"
                      value={styleForm.backgroundColor}
                      onChange={(e) => updateStyleField('backgroundColor', e.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Position + Animation */}
              <div className="alerts-style-row">
                <div className="alerts-style-field">
                  <label className="alerts-style-label">מיקום</label>
                  <select
                    className="alerts-style-select"
                    value={styleForm.position}
                    onChange={(e) => updateStyleField('position', e.target.value)}
                  >
                    <option value="top">למעלה</option>
                    <option value="bottom">למטה</option>
                    <option value="center">מרכז</option>
                    <option value="ticker">טיקר</option>
                  </select>
                </div>
                <div className="alerts-style-field">
                  <label className="alerts-style-label">אנימציה</label>
                  <select
                    className="alerts-style-select"
                    value={styleForm.animation}
                    onChange={(e) => updateStyleField('animation', e.target.value)}
                  >
                    <option value="fade-in">דעיכה</option>
                    <option value="slide-up">גלילה למעלה</option>
                    <option value="slide-left">גלילה שמאלה</option>
                    <option value="typewriter">מכונת כתיבה</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
