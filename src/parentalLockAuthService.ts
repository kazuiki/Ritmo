// Shared authentication state for parental lock
class ParentalLockAuthService {
  private static authenticatedTabs: Set<string> = new Set();
  private static listeners: Array<(isAuth: boolean) => void> = [];

  static getAuthenticationStatus(): boolean {
    // Return true if any tab is authenticated (for global checks)
    return this.authenticatedTabs.size > 0;
  }

  static isTabAuthenticated(tabName: string): boolean {
    return this.authenticatedTabs.has(tabName);
  }

  static setAuthenticated(status: boolean, tabName?: string): void {
    if (status && tabName) {
      this.authenticatedTabs.add(tabName);
    } else if (!status && tabName) {
      this.authenticatedTabs.delete(tabName);
    } else if (!status) {
      // Clear all if no specific tab
      this.authenticatedTabs.clear();
    }
    
    // Notify all listeners about the change
    this.listeners.forEach(listener => listener(this.getAuthenticationStatus()));
  }

  static addListener(listener: (isAuth: boolean) => void): void {
    this.listeners.push(listener);
  }

  static removeListener(listener: (isAuth: boolean) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  static clearAuthentication(): void {
    this.authenticatedTabs.clear();
    // Notify all listeners about the change
    this.listeners.forEach(listener => listener(false));
  }

  static clearTabAuthentication(tabName: string): void {
    this.authenticatedTabs.delete(tabName);
    // Notify all listeners about the change
    this.listeners.forEach(listener => listener(this.getAuthenticationStatus()));
  }

  // Clear authentication when navigating away from protected tabs
  static onNavigateAwayFromProtectedTab(tabName: string): void {
    this.clearTabAuthentication(tabName);
  }

  // Clear all authentication when navigating to non-protected tabs
  static onNavigateToPublicTab(): void {
    this.clearAuthentication();
  }
}

export { ParentalLockAuthService };

