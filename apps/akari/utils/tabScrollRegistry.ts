type TabScrollHandler = {
  scrollToTop?: () => void;
  scrollBy?: (deltaY: number) => void;
  containsTarget?: (target: EventTarget | null) => boolean;
};

class TabScrollRegistry {
  private handlers: Record<string, TabScrollHandler> = {};

  register(tabName: string, handler: TabScrollHandler | (() => void)) {
    if (typeof handler === 'function') {
      this.handlers[tabName] = { scrollToTop: handler };
      return;
    }

    this.handlers[tabName] = handler;
  }

  handleTabPress(tabName: string) {
    this.handlers[tabName]?.scrollToTop?.();
  }

  scrollBy(tabName: string, deltaY: number) {
    this.handlers[tabName]?.scrollBy?.(deltaY);
  }

  isEventWithinScrollArea(tabName: string, target: EventTarget | null) {
    return this.handlers[tabName]?.containsTarget?.(target) ?? false;
  }
}

export const tabScrollRegistry = new TabScrollRegistry();
