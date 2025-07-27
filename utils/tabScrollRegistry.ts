type ScrollToTopHandler = () => void;

class TabScrollRegistry {
  private handlers: Record<string, ScrollToTopHandler> = {};

  register(tabName: string, handler: ScrollToTopHandler) {
    console.log("Registering scroll handler for tab:", tabName);
    this.handlers[tabName] = handler;
  }

  handleTabPress(tabName: string) {
    console.log("Tab scroll registry handling press for:", tabName);
    const handler = this.handlers[tabName];
    if (handler) {
      console.log("Triggering scroll to top for:", tabName);
      handler();
    } else {
      console.log("No handler found for tab:", tabName);
    }
  }
}

export const tabScrollRegistry = new TabScrollRegistry();
