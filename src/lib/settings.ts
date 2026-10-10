import { cache } from "react";
import { db } from "./db";
import { DEFAULT_SETTINGS, storeSettingsSchema, type StoreSettings } from "./settings-defaults";

export { DEFAULT_SETTINGS, storeSettingsSchema, type StoreSettings };

export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const row = await db.setting.findUnique({ where: { key: "store" } });
    const parsed = storeSettingsSchema.safeParse(row?.value ?? {});
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch (err) {
    console.error("[settings] falling back to defaults:", (err as Error).message);
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettings(settings: StoreSettings) {
  const value = storeSettingsSchema.parse(settings);
  await db.setting.upsert({ where: { key: "store" }, update: { value }, create: { key: "store", value } });
}
