import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  legalName: z.string().min(1).max(200).optional(),
  industry: z.string().max(60).optional(),
  timezone: z.string().max(64).optional(),
  currency: z.string().length(3).optional(),
  locale: z.string().max(10).optional(),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/** White-label "skin" — free-form JSON validated at the top level only. */
export const updateBrandingSchema = z.object({
  theme: z.record(z.unknown()).optional(),
  logoUrl: z.string().url().max(2000).optional(),
  faviconUrl: z.string().url().max(2000).optional(),
  loginBackgroundUrl: z.string().url().max(2000).optional(),
  emailHeaderHtml: z.string().max(20_000).optional(),
  emailFooterHtml: z.string().max(20_000).optional(),
  iconPack: z.string().max(60).optional(),
});
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;

export const updateTerminologySchema = z.record(z.string().min(1).max(60));
export type UpdateTerminologyInput = z.infer<typeof updateTerminologySchema>;

export const updateModulesSchema = z.record(z.boolean());
export type UpdateModulesInput = z.infer<typeof updateModulesSchema>;
