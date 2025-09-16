import type { MutableRefObject } from 'react';

type ScrollableRef = {
  getScrollableNode?: () => HTMLElement | null;
  getInnerViewNode?: () => HTMLElement | null;
  getNativeScrollRef?: () => { getScrollableNode?: () => HTMLElement | null } | HTMLElement | null;
};

export function createContainsTarget(ref: MutableRefObject<any>) {
  return (target: EventTarget | null) => {
    if (!target || typeof (target as any).nodeType !== 'number') {
      return false;
    }

    const scrollView = ref.current as ScrollableRef | null | undefined;

    if (!scrollView) {
      return true;
    }

    const potentialNodes: (HTMLElement | null | undefined)[] = [];

    if (typeof scrollView.getScrollableNode === 'function') {
      potentialNodes.push(scrollView.getScrollableNode());
    }

    if (typeof scrollView.getInnerViewNode === 'function') {
      potentialNodes.push(scrollView.getInnerViewNode());
    }

    if (typeof scrollView.getNativeScrollRef === 'function') {
      const nativeRef = scrollView.getNativeScrollRef();
      if (nativeRef && typeof nativeRef === 'object') {
        if ('getScrollableNode' in nativeRef && typeof nativeRef.getScrollableNode === 'function') {
          potentialNodes.push(nativeRef.getScrollableNode());
        }
      }
    }

    if (potentialNodes.length === 0) {
      return true;
    }

    return potentialNodes.some((node) => node && typeof node.contains === 'function' && node.contains(target as Node));
  };
}
