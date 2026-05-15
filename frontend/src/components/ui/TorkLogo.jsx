import { useState, useEffect } from 'react';
import logoTork from '../../assets/logo-tork.png';
import { useThemeStore } from '../../store/themeStore';

let transparentCache = null;

function buildTransparentLogo() {
  if (transparentCache) return Promise.resolve(transparentCache);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) {
          // Smooth fade: pure white → transparent, near-white → partial
          data[i + 3] = Math.round(255 * (1 - (Math.min(r, g, b) - 200) / 55));
        }
      }
      ctx.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);
      transparentCache = canvas.toDataURL('image/png');
      resolve(transparentCache);
    };
    img.src = logoTork;
  });
}

export default function TorkLogo({ size = 40, className = '', full = false }) {
  const { theme } = useThemeStore();
  const [transparentSrc, setTransparentSrc] = useState(transparentCache);

  useEffect(() => {
    buildTransparentLogo().then(setTransparentSrc);
  }, []);

  const src = theme === 'dark' && transparentSrc ? transparentSrc : logoTork;

  return (
    <img
      src={src}
      alt={full ? 'Tork Locações' : 'Tork'}
      height={size}
      style={{ height: size, width: 'auto', objectFit: 'contain' }}
      className={className}
    />
  );
}
