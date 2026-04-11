export const pageAccessService = {
  /**
   * Pages that can be accessed without login
   */
  publicPages: [
    "/",
    "/login",
    "/signup",
    "/member",           // Member dashboard - PUBLIC
    "/member/blok",      // Blok page - PUBLIC
    "/member/couple",    // Couple page - PUBLIC
    "/member/average-score", // Average score - PUBLIC
    "/member/mini-blok", // Mini blok - PUBLIC
  ],

  /**
   * Check if a page can be accessed without authentication
   */
  isPublicPage(path: string): boolean {
    return this.publicPages.includes(path);
  },

  /**
   * Get pages accessible by a member (mocked for backward compatibility with components)
   */
  async getAccessiblePages(memberId: string): Promise<string[]> {
    // Return all possible pages since we removed the complex permission system
    return [
      ...this.publicPages,
      "/member/chat",
      "/member/gallery",
      "/member/profile",
      "/member/training",
      "/member/five-five",
      "/member/hall-of-fame",
      "/member/lane",
      "/member/undi-lane",
      "/member/feedback"
    ];
  },
  
  /**
   * Check if member has access to a specific page (mocked for backward compatibility)
   */
  async hasPageAccess(memberId: string, pagePath: string): Promise<boolean> {
    return true; // Assume true for logged-in members now that we simplified
  }
};