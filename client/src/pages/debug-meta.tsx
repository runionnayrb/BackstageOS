import { useEffect, useState } from 'react';
import { useSEO } from '@/hooks/useSEO';

export default function DebugMeta() {
  useSEO();
  const [metaTags, setMetaTags] = useState<string[]>([]);

  useEffect(() => {
    // Get all meta tags from the document
    const metas = Array.from(document.querySelectorAll('meta'));
    const metaInfo = metas.map(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || 'unknown';
      const content = meta.getAttribute('content') || 'no content';
      return `${name}: ${content}`;
    });
    setMetaTags(metaInfo);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Meta Tags Debug</h1>
      <div className="space-y-2">
        {metaTags.map((tag, index) => (
          <div key={index} className="p-2 bg-gray-100 rounded text-sm">
            {tag}
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Image Test</h2>
        <img 
          src="/uploads/shareImage-1751382133557.png" 
          alt="Share image test"
          className="max-w-md"
          onError={() => console.log('Image failed to load')}
          onLoad={() => console.log('Image loaded successfully')}
        />
      </div>
    </div>
  );
}