import { useState } from 'react';
import { useFavorites, useCreateFavorite, useUpdateFavorite, useDeleteFavorite } from '../hooks/useFavorites';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { PRESET_CHANNELS, CHANNEL_CATEGORIES, CHANNEL_NAMES } from '../lib/constants';
import type { Favorite } from '@screen-commander/shared';
import './ChannelManager.css';

interface ChannelManagerProps {
  selectedUrl?: string;
  onSelect?: (url: string) => void;
  mode?: 'pick' | 'manage';
}

interface MergedChannel {
  id?: string;
  name: string;
  url: string;
  category: string;
  isCustom: boolean;
}

export function ChannelManager({ selectedUrl, onSelect, mode = 'pick' }: ChannelManagerProps) {
  const { data: favorites } = useFavorites();
  const createFav = useCreateFavorite();
  const updateFav = useUpdateFavorite();
  const deleteFav = useDeleteFavorite();
  const { toast } = useToast();

  const isManageMode = mode === 'manage';
  const [showManage, setShowManage] = useState(isManageMode);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState('חדשות');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('חדשות');

  const customChannels: MergedChannel[] = (favorites ?? []).map((f) => ({
    id: f.id, name: f.name, url: f.url,
    category: f.icon || 'מותאם אישית', isCustom: true,
  }));
  const customNames = new Set(customChannels.map((c) => c.name));
  const presetChannels: MergedChannel[] = PRESET_CHANNELS
    .filter((p) => !customNames.has(p.name))
    .map((p) => ({ name: p.name, url: p.url, category: p.category, isCustom: false }));
  const allChannels = [...presetChannels, ...customChannels];
  const categoryOptions = CHANNEL_CATEGORIES.filter((c) => c !== 'הכל');

  // Group channels by category
  const grouped = new Map<string, MergedChannel[]>();
  for (const ch of allChannels) {
    const list = grouped.get(ch.category) ?? [];
    list.push(ch);
    grouped.set(ch.category, list);
  }

  const startEdit = (ch: MergedChannel) => {
    if (!ch.isCustom) {
      createFav.mutate(
        { name: ch.name, url: ch.url, type: 'HLS_STREAM', icon: ch.category, order: 0 },
        {
          onSuccess: (fav: Favorite) => {
            setEditingId(fav.id); setEditName(ch.name); setEditUrl(ch.url); setEditCategory(ch.category);
          },
        },
      );
      return;
    }
    setEditingId(ch.id ?? null); setEditName(ch.name); setEditUrl(ch.url); setEditCategory(ch.category);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim() || !editUrl.trim()) return;
    updateFav.mutate(
      { id: editingId, name: editName.trim(), url: editUrl.trim(), icon: editCategory },
      { onSuccess: () => { toast('הערוץ עודכן', 'success'); setEditingId(null); }, onError: () => toast('שגיאה בעדכון', 'error') },
    );
  };

  const handleDelete = (id: string) => {
    deleteFav.mutate(id, { onSuccess: () => toast('הערוץ נמחק', 'info') });
    if (editingId === id) setEditingId(null);
  };

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim()) { toast('יש למלא שם וכתובת', 'error'); return; }
    createFav.mutate(
      { name: newName.trim(), url: newUrl.trim(), type: 'HLS_STREAM', icon: newCategory, order: 0 },
      { onSuccess: () => { toast('ערוץ נוסף', 'success'); setNewName(''); setNewUrl(''); }, onError: () => toast('שגיאה', 'error') },
    );
  };

  const handleChannelClick = (ch: MergedChannel) => {
    if (showManage) startEdit(ch);
    else onSelect?.(ch.url);
  };

  return (
    <div className="chm">
      {/* Toolbar */}
      {!isManageMode && (
        <div className="chm-toolbar">
          <button className={`chm-mode-btn${showManage ? ' active' : ''}`} onClick={() => setShowManage(!showManage)}>
            {showManage ? 'סיום עריכה' : 'ניהול ערוצים'}
          </button>
        </div>
      )}

      {/* Channel groups */}
      <div className="chm-groups">
        {Array.from(grouped.entries()).map(([cat, channels]) => (
          <div key={cat} className="chm-group">
            <div className="chm-group-header">
              <span className="chm-group-label">{cat}</span>
              <span className="chm-group-count">{channels.length}</span>
              <div className="chm-group-line" />
            </div>
            <div className="chm-group-grid">
              {channels.map((ch) => {
                const isSelected = selectedUrl === ch.url;
                const isEditing = editingId === ch.id;
                return (
                  <button key={ch.id ?? ch.url}
                    className={`chm-card${isSelected ? ' chm-card--selected' : ''}${isEditing ? ' chm-card--editing' : ''}${ch.isCustom ? ' chm-card--custom' : ''}`}
                    onClick={() => handleChannelClick(ch)}
                    title={ch.url}>
                    <span className="chm-card-name">{ch.name}</span>
                    {showManage && ch.isCustom && ch.id && (
                      <span className="chm-card-delete" onClick={(e) => { e.stopPropagation(); handleDelete(ch.id!); }}>✕</span>
                    )}
                    {isSelected && <span className="chm-card-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit panel */}
      {editingId && (
        <div className="chm-panel">
          <div className="chm-panel-header">
            <span className="chm-panel-title">עריכת ערוץ</span>
            <button className="chm-panel-close" onClick={() => setEditingId(null)}>✕</button>
          </div>
          <div className="chm-panel-fields">
            <div className="chm-field">
              <label className="chm-field-label">שם</label>
              <input className="chm-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="chm-field chm-field--wide">
              <label className="chm-field-label">כתובת URL</label>
              <input className="chm-input chm-input--mono" dir="ltr" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
            </div>
            <div className="chm-field">
              <label className="chm-field-label">קטגוריה</label>
              <select className="chm-select" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="מותאם אישית">מותאם אישית</option>
              </select>
            </div>
          </div>
          <div className="chm-panel-actions">
            <Button size="sm" variant="primary" onClick={saveEdit}>שמור שינויים</Button>
            <Button size="sm" onClick={() => setEditingId(null)}>ביטול</Button>
          </div>
        </div>
      )}

      {/* Add panel — hidden when editing */}
      {showManage && !editingId && (
        <div className="chm-panel chm-panel--add">
          <div className="chm-panel-header">
            <span className="chm-panel-title">הוספת ערוץ חדש</span>
          </div>
          <div className="chm-panel-fields">
            <div className="chm-field">
              <label className="chm-field-label">שם</label>
              <input className="chm-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="שם הערוץ" />
            </div>
            <div className="chm-field chm-field--wide">
              <label className="chm-field-label">כתובת URL</label>
              <input className="chm-input chm-input--mono" dir="ltr" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="chm-field">
              <label className="chm-field-label">קטגוריה</label>
              <select className="chm-select" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="מותאם אישית">מותאם אישית</option>
              </select>
            </div>
          </div>
          <div className="chm-panel-actions">
            <Button size="sm" variant="primary" onClick={handleAdd} disabled={createFav.isPending}>+ הוסף ערוץ</Button>
          </div>
        </div>
      )}
    </div>
  );
}
