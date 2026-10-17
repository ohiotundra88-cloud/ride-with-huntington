import type { ComponentType } from "react";

/** Data a caller passes when sending a template. Not validated at runtime. */
export type TemplateData = Record<string, unknown>;

export interface TemplateEntry {
  component: ComponentType<TemplateData>;
  subject: string | ((data: TemplateData) => string);
  displayName?: string;
  previewData?: TemplateData;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Registers an email template. `previewData` is checked against the
 * component's own props here; at send time the component receives whatever
 * TemplateData the caller supplies, so every prop should be optional and
 * rendered defensively.
 */
export function defineTemplate<P extends object>(template: {
  component: ComponentType<P>;
  subject: string | ((data: TemplateData) => string);
  displayName?: string;
  previewData?: P;
  to?: string;
}): TemplateEntry {
  return {
    ...template,
    component: template.component as unknown as ComponentType<TemplateData>,
    previewData: template.previewData as TemplateData | undefined,
  };
}
