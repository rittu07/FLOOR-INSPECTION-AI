'use client';

import { useEffect } from 'react';
import { isTunnelUrl, resolveImageUrl } from '@/lib/api';

/**
 * Free ngrok tunnels answer plain <img> requests with an HTML warning page. This watches the page for images
 * whose src points at an ngrok backend and swaps them for blob: URLs fetched with the skip-warning header,
 * so every result/mosaic/frame image works without changing each component.
 */
export function TunnelImageLoader() {
  useEffect(() => {
    const fix = (img: HTMLImageElement) => {
      const src = img.getAttribute('src') || '';
      if (!isTunnelUrl(src)) return;
      resolveImageUrl(src)
        .then((blobUrl) => {
          // Only swap if React has not pointed the element at a different image meanwhile
          if (img.getAttribute('src') === src) img.setAttribute('src', blobUrl);
        })
        .catch(() => {
          // leave the original src; the image just stays unavailable
        });
    };

    document.querySelectorAll('img').forEach(fix);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target instanceof HTMLImageElement) fix(m.target);
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) fix(node);
          else if (node instanceof Element) node.querySelectorAll('img').forEach(fix);
        });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
