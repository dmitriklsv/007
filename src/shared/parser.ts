import { z } from "zod";

export const optionalBoolString = () =>
  z
    .enum(["true", "false"])
    .optional()
    .transform(s => (s ? s === "true" : undefined));

export const numberString = () => z.string().transform(Number).pipe(z.number());

export const optionalNumberString = () =>
  z
    .string()
    .optional()
    .transform(val => (val ? Number(val) : val))
    .pipe(z.number().optional());

export const stringDate = () =>
  z
    .string()
    .transform(stringDate => new Date(stringDate))
    .pipe(z.date());

export const dateStringWithTimezone = () =>
  z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
      { message: "Date string must have timezone" }
    )
    .transform(s => new Date(s))
    .pipe(z.date());

// Form data multipart use cases
export const nonEmptyStringOrUndefined = () =>
  z
    .string()
    .optional()
    .transform(s => s || undefined);

export const paginatedParamsSchema = () =>
  z.object({
    page: z
      .string()
      .optional()
      .default("1")
      .transform(Number)
      .pipe(z.number().int().min(1)),
    take: z
      .string()
      .optional()
      .default("60")
      .transform(Number)
      .pipe(z.number().int().positive().max(300))
  });

export const nftTokenId = () =>
  z.union([z.string(), z.number()]).transform(String);
