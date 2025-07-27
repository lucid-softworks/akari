type ScrollToTopHandler = () => void;

class TabScrollRegistry {
  private handlers: Record<string, ScrollToTopHandler> = {};

  register(tabName: string, handler: ScrollToTopHandler) {
    this.handlers[tabName] = handler;
  }

  handleTabPress(tabName: string) {
    const handler = this.handlers[tabName];
    if (handler) {
      handler();
    }
  }
}

export const tabScrollRegistry = new TabScrollRegistry();
