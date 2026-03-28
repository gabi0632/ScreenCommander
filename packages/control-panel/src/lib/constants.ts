/** Hebrew labels for message positions */
export const positionLabels: Record<string, string> = {
  top: 'למעלה',
  bottom: 'למטה',
  center: 'מרכז',
  ticker: 'טיקר',
};

/** Hebrew labels for content types */
export const contentTypeLabels: Record<string, string> = {
  WEB_URL: 'כתובת אינטרנט',
  YOUTUBE: 'YouTube',
  RTMP_STREAM: 'שידור RTMP',
  HLS_STREAM: 'שידור HLS',
  LOCAL_VIDEO: 'וידאו מקומי',
  LOCAL_IMAGE: 'תמונה מקומית',
  CUSTOM_HTML: 'HTML מותאם',
};

/** Map of known channel URLs to Hebrew display names */
export const CHANNEL_NAMES: Record<string, string> = {
  'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8': 'כאן 11',
  'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan_edu/live.livx/playlist.m3u8': 'כאן חינוכית',
  'https://mako-streaming.akamaized.net/direct/hls/live/2033791/k12/index_2200.m3u8': 'ערוץ 12',
  'https://reshet.g-mana.live/media/6f10d1da-0803-48d9-9272-57a811958974/mainManifest.m3u8': 'ערוץ 13',
  'https://bcovlive-a.akamaihd.net/d89ede8094c741b7924120b27764153c/eu-central-1/5377161796001/playlist.m3u8': 'i24NEWS עברית',
  'https://cdn.cybercdn.live/HidabrootIL/Live97/playlist.m3u8': 'הידברות',
  'https://live-hls-apps-aja-fa.getaj.net/AJA/index.m3u8': 'אל ג׳זירה',
  'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8': 'BBC News',
  'https://radiovid.foxnews.com/hls/live/661547/RADIOVID/index.m3u8': 'Fox News',
  'http://41.205.93.154/FOX-NEWS/index.m3u8': 'Fox News',
  'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8': 'CBS News',
  'https://cbsn-ny.cbsnstream.cbsnews.com/out/v1/ec3897d58a9b45129a77d67aa247d136/master.m3u8': 'CBS New York',
  'https://www.bloomberg.com/media-manifest/streams/us.m3u8': 'Bloomberg TV',
  'https://nmx1ota.akamaized.net/hls/live/2107010/Live_1/index.m3u8': 'Newsmax',
  'https://nmxlive.akamaized.net/hls/live/529965/Live_1/index.m3u8': 'Newsmax 2',
  'https://stream.livenewsplay.com:9443/hls/cnbc/cnbcsd.m3u8': 'CNBC',
};

/** Preset channels for the ChangeUrlModal */
export interface Channel {
  name: string;
  url: string;
  category: string;
}

export const PRESET_CHANNELS: Channel[] = [
  { name: 'כאן 11', url: 'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8', category: 'חדשות' },
  { name: 'ערוץ 12', url: 'https://mako-streaming.akamaized.net/direct/hls/live/2033791/k12/index_2200.m3u8', category: 'חדשות' },
  { name: 'ערוץ 13 (כתוביות)', url: 'https://reshet.g-mana.live/media/6f10d1da-0803-48d9-9272-57a811958974/mainManifest.m3u8', category: 'חדשות' },
  { name: 'i24NEWS עברית', url: 'https://bcovlive-a.akamaihd.net/d89ede8094c741b7924120b27764153c/eu-central-1/5377161796001/playlist.m3u8', category: 'חדשות' },
  { name: 'כאן חינוכית', url: 'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan_edu/live.livx/playlist.m3u8', category: 'ילדים וחינוך' },
  { name: 'הידברות', url: 'https://cdn.cybercdn.live/HidabrootIL/Live97/playlist.m3u8', category: 'דת' },
  { name: 'אל ג׳זירה', url: 'https://live-hls-apps-aja-fa.getaj.net/AJA/index.m3u8', category: 'בינלאומי' },
  { name: 'BBC News', url: 'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8', category: 'בינלאומי' },
  { name: 'Fox News (720p)', url: 'https://radiovid.foxnews.com/hls/live/661547/RADIOVID/index.m3u8', category: 'בינלאומי' },
  { name: 'Fox News (480p)', url: 'http://41.205.93.154/FOX-NEWS/index.m3u8', category: 'בינלאומי' },
  { name: 'CBS News', url: 'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8', category: 'בינלאומי' },
  { name: 'CBS New York', url: 'https://cbsn-ny.cbsnstream.cbsnews.com/out/v1/ec3897d58a9b45129a77d67aa247d136/master.m3u8', category: 'בינלאומי' },
  { name: 'Bloomberg TV', url: 'https://www.bloomberg.com/media-manifest/streams/us.m3u8', category: 'בינלאומי' },
  { name: 'Newsmax', url: 'https://nmx1ota.akamaized.net/hls/live/2107010/Live_1/index.m3u8', category: 'בינלאומי' },
  { name: 'Newsmax 2', url: 'https://nmxlive.akamaized.net/hls/live/529965/Live_1/index.m3u8', category: 'בינלאומי' },
  { name: 'CNBC', url: 'https://stream.livenewsplay.com:9443/hls/cnbc/cnbcsd.m3u8', category: 'בינלאומי' },
];

export const CHANNEL_CATEGORIES = ['הכל', 'חדשות', 'ילדים וחינוך', 'דת', 'בינלאומי'];
