import { useState, useEffect } from 'react';

let currentFolderName = 'Email';
const listeners = new Set<(folderName: string) => void>();

export function setFolderName(folderName: string) {
  currentFolderName = folderName;
  listeners.forEach(listener => listener(folderName));
}

export function useFolderName() {
  const [folderName, setFolderNameState] = useState(currentFolderName);

  useEffect(() => {
    const listener = (newFolderName: string) => {
      setFolderNameState(newFolderName);
    };
    
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return folderName;
}