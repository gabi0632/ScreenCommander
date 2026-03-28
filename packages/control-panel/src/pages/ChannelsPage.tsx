import { ChannelManager } from '../components/ChannelManager';

export default function ChannelsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 className="text-h1">ניהול ערוצים</h1>
        <p className="text-caption" style={{ marginTop: 4 }}>
          הוסף, ערוך ומחק ערוצים. שינויים ישפיעו על כל המערכת — תזמון, שינוי URL ועוד.
        </p>
      </div>
      <ChannelManager mode="manage" />
    </div>
  );
}
