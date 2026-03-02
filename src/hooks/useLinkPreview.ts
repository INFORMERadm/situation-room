import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { LinkPreview } from '../types/chat';

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

export function useLinkPreview() {
  const [previews, setPreviews] = useState<Map<string, LinkPreview>>(new Map());
  const pendingRef = useRef(new Set<string>());

  const extractUrls = useCallback((text: string): string[] => {
    const matches = text.match(URL_REGEX);
    return matches ? [...new Set(matches)] : [];
  }, []);

  const fetchPreview = useCallback(async (url: string) => {
    if (previews.has(url) || pendingRef.current.has(url)) return;
    pendingRef.current.add(url);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${supabaseUrl}/functions/v1/link-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.title || data.description || data.image_url) {
        const preview: LinkPreview = {
          url: data.url || url,
          title: data.title || '',
          description: data.description || '',
          image_url: data.image_url || null,
          site_name: data.site_name || null,
        };
        setPreviews(prev => new Map(prev).set(url, preview));
      }
    } catch {
      // silently fail
    } finally {
      pendingRef.current.delete(url);
    }
  }, [previews]);

  const fetchPreviewsForText = useCallback((text: string) => {
    const urls = extractUrls(text);
    urls.forEach(url => fetchPreview(url));
  }, [extractUrls, fetchPreview]);

  return {
    previews,
    extractUrls,
    fetchPreview,
    fetchPreviewsForText,
    getPreview: (url: string) => previews.get(url) || null,
  };
}
