import { useEffect, useState } from 'react';
export function useStorageEstimate(){
  const [usedMB, setUsedMB] = useState(0);
  const [quotaMB, setQuotaMB] = useState(0);
  useEffect(() => {
    let t = setInterval(async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const est = await navigator.storage.estimate();
        setUsedMB((est.usage || 0) / (1024*1024));
        setQuotaMB((est.quota || 0) / (1024*1024));
      }
    }, 1500);
    return () => clearInterval(t);
  }, []);
  return { usedMB, quotaMB };
}
