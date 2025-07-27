import { useState, useEffect } from "react";
import { LucideIcon } from "lucide-react";

interface HeaderIcon {
  icon: LucideIcon;
  onClick: () => void;
  title: string;
}

let headerIconsValue: HeaderIcon[] = [];
let setHeaderIconsCallback: ((icons: HeaderIcon[]) => void) | null = null;

export function useHeaderIcons() {
  const [headerIcons, setHeaderIcons] = useState<HeaderIcon[]>(headerIconsValue);

  useEffect(() => {
    setHeaderIconsCallback = setHeaderIcons;
    return () => {
      setHeaderIconsCallback = null;
    };
  }, []);

  return { headerIcons };
}

export function setPageHeaderIcons(icons: HeaderIcon[]) {
  headerIconsValue = icons;
  if (setHeaderIconsCallback) {
    setHeaderIconsCallback(icons);
  }
}

export function clearPageHeaderIcons() {
  headerIconsValue = [];
  if (setHeaderIconsCallback) {
    setHeaderIconsCallback([]);
  }
}