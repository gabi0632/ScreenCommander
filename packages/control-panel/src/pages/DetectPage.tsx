import { useState } from 'react';
import { useMonitors, useScanMonitors } from '../hooks/useMonitors';
import { useDisplays, useCreateDisplay, useDeleteDisplay } from '../hooks/useDisplays';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { ConnectionType } from '@screen-commander/shared';
import './DetectPage.css';

export default function DetectPage() {
  const { data: monitors, isLoading } = useMonitors();
  const { data: displays } = useDisplays();
  const scanMonitors = useScanMonitors();
  const createDisplay = useCreateDisplay();
  const deleteDisplay = useDeleteDisplay();
  const { toast } = useToast();

  const [connectionTypes, setConnectionTypes] = useState<Record<number, string>>({});

  const activeDisplayIndices = new Set(displays?.map((d) => d.monitorIndex));

  const getConnectionType = (index: number): string =>
    connectionTypes[index] ?? ConnectionType.HDMI;

  const setConnectionType = (index: number, type: string) => {
    setConnectionTypes((prev) => ({ ...prev, [index]: type }));
  };

  const handleScan = () => {
    scanMonitors.mutate(undefined, {
      onSuccess: () => toast('סריקת מסכים הושלמה', 'success'),
      onError: () => toast('שגיאה בסריקת מסכים', 'error'),
    });
  };

  const handleAdd = (monitor: { deviceName: string; width: number; height: number; x: number; y: number }, index: number) => {
    const connType = getConnectionType(index);
    const isHdmi = connType === ConnectionType.HDMI;
    createDisplay.mutate(
      {
        name: `מסך ${index + 1}`,
        monitorIndex: index,
        connectionType: connType,
        portLabel: `${isHdmi ? 'HDMI' : 'DP'}-${index}`,
        width: monitor.width,
        height: monitor.height,
        posX: monitor.x,
        posY: monitor.y,
      },
      {
        onSuccess: () => toast(`מסך ${index + 1} נוסף`, 'success'),
        onError: () => toast('שגיאה בהוספת מסך', 'error'),
      },
    );
  };

  const handleRemove = (displayId: string, name: string) => {
    deleteDisplay.mutate(displayId, {
      onSuccess: () => toast(`${name} הוסר`, 'info'),
    });
  };

  return (
    <div className="detect-page">
      <div className="detect-header">
        <div>
          <h1 className="text-h1">זיהוי מסכים</h1>
          <p className="text-caption" style={{ marginTop: 4 }}>
            סרוק את המסכים המחוברים למערכת והוסף אותם
          </p>
        </div>
        <Button variant="primary" onClick={handleScan} disabled={scanMonitors.isPending}>
          {scanMonitors.isPending ? 'סורק...' : 'סרוק מחדש'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-caption">טוען...</p>
      ) : monitors && monitors.length > 0 ? (
        <div className="detect-grid">
          {monitors.map((monitor, index) => {
            const isActive = activeDisplayIndices.has(index);
            const matchingDisplay = displays?.find((d) => d.monitorIndex === index);

            return (
              <Card key={`${monitor.deviceName}-${index}`} className={`detect-card ${monitor.primary ? 'detect-card--primary' : ''}`}>
                <div className="detect-card-header">
                  <div className="detect-card-name">{monitor.deviceName || `Monitor ${index}`}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {monitor.primary && <Badge variant="blue">ראשי</Badge>}
                    {isActive && <Badge variant="accent" pulse>פעיל</Badge>}
                  </div>
                </div>

                <div className="detect-card-specs">
                  <div className="detect-card-spec">
                    <span className="detect-card-spec-label">רזולוציה</span>
                    <span className="detect-card-spec-value text-mono">
                      {monitor.width}x{monitor.height}
                    </span>
                  </div>
                  <div className="detect-card-spec">
                    <span className="detect-card-spec-label">מיקום</span>
                    <span className="detect-card-spec-value text-mono">
                      ({monitor.x}, {monitor.y})
                    </span>
                  </div>
                </div>

                {monitor.primary ? (
                  <div className="detect-card-primary-note">
                    ראשי — בקרה
                  </div>
                ) : isActive && matchingDisplay ? (
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={() => handleRemove(matchingDisplay.id, matchingDisplay.name)}
                  >
                    הסר
                  </Button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Select
                      label="סוג חיבור"
                      value={getConnectionType(index)}
                      onChange={(e) => setConnectionType(index, e.target.value)}
                      options={[
                        { value: ConnectionType.HDMI, label: 'HDMI' },
                        { value: ConnectionType.DISPLAY_PORT, label: 'DisplayPort' },
                      ]}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleAdd(monitor, index)}
                      disabled={createDisplay.isPending}
                    >
                      + הוסף
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="detect-empty">
          <p className="text-caption">לא נמצאו מסכים. לחץ על &quot;סרוק מחדש&quot; לזיהוי.</p>
        </div>
      )}
    </div>
  );
}
