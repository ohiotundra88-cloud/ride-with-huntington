export interface SiteSettings {
  fundraiserPagesEnabled: boolean;
  vendorCrmEnabled: boolean;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  fundraiserPagesEnabled: true,
  vendorCrmEnabled: true,
};
