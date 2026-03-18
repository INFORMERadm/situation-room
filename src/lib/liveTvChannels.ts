export interface LiveTvChannel {
  id: string;
  label: string;
  youtubeVideoId?: string;
  youtubeChannelId?: string;
}

export const LIVE_TV_CHANNELS: LiveTvChannel[] = [
  { id: 'bloomberg', label: 'BLOOMBERG', youtubeVideoId: 'iEpJwprxDdk' },
  { id: 'skynews', label: 'SKY NEWS', youtubeVideoId: 'YDvsBbKfLPA' },
  { id: 'dw', label: 'DW', youtubeChannelId: 'UCknLrEdhRCp1aegoMqRaCZg' },
  { id: 'cnbc', label: 'CNBC', youtubeVideoId: '9NyxcX3rhQs' },
  { id: 'france24en', label: 'FRANCE24 EN', youtubeChannelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg' },
  { id: 'france24fr', label: 'FRANCE24 FR', youtubeChannelId: 'UCCCPCZNChQdGa9EkATeye4g' },
  { id: 'alarabiya', label: 'ALARABIYA', youtubeChannelId: 'UCahpxixMCwoANAftn6IxkTg' },
  { id: 'aljazeera', label: 'ALJAZEERA', youtubeChannelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg' },
  { id: 'gbtv', label: 'GB-TV', youtubeVideoId: 'QliL4CGc7iY' },
  { id: 'foxnews', label: 'FOX NEWS', youtubeVideoId: 'C96oohpWBGw' },
];

export const DEFAULT_CHANNEL_ORDER = LIVE_TV_CHANNELS.map(c => c.id);

export function buildEmbedUrl(channel: LiveTvChannel, muted: boolean): string {
  const muteParam = muted ? 1 : 0;
  if (channel.youtubeVideoId) {
    return `https://www.youtube.com/embed/${channel.youtubeVideoId}?autoplay=1&mute=${muteParam}&loop=1&playlist=${channel.youtubeVideoId}&controls=0&modestbranding=1&showinfo=0&rel=0`;
  }
  if (channel.youtubeChannelId) {
    return `https://www.youtube.com/embed/live_stream?channel=${channel.youtubeChannelId}&autoplay=1&mute=${muteParam}&controls=0&modestbranding=1&showinfo=0&rel=0`;
  }
  return '';
}
