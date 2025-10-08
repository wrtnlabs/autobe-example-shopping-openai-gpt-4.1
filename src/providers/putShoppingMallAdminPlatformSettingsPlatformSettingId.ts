import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminPlatformSettingsPlatformSettingId(props: {
  admin: AdminPayload;
  platformSettingId: string & tags.Format<"uuid">;
  body: IShoppingMallPlatformSettings.IUpdate;
}): Promise<IShoppingMallPlatformSettings> {
  // Find existing, active platform setting (not soft deleted)
  const setting =
    await MyGlobal.prisma.shopping_mall_platform_settings.findFirst({
      where: { id: props.platformSettingId, deleted_at: null },
    });
  if (!setting) {
    throw new HttpException("Platform settings record not found", 404);
  }
  // Update with allowed fields, always set updated_at
  const updated = await MyGlobal.prisma.shopping_mall_platform_settings.update({
    where: { id: props.platformSettingId },
    data: {
      site_title_ko: props.body.site_title_ko ?? undefined,
      site_title_en: props.body.site_title_en ?? undefined,
      site_description_ko: props.body.site_description_ko ?? undefined,
      site_description_en: props.body.site_description_en ?? undefined,
      support_email: props.body.support_email ?? undefined,
      support_phone: props.body.support_phone ?? undefined,
      branding_logo_uri: props.body.branding_logo_uri ?? undefined,
      privacy_policy_uri: props.body.privacy_policy_uri ?? undefined,
      terms_of_service_uri: props.body.terms_of_service_uri ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return all fields with correct null/undefined handling, convert dates
  return {
    id: updated.id,
    site_title_ko: updated.site_title_ko,
    site_title_en: updated.site_title_en,
    site_description_ko: updated.site_description_ko ?? undefined,
    site_description_en: updated.site_description_en ?? undefined,
    support_email: updated.support_email ?? undefined,
    support_phone: updated.support_phone ?? undefined,
    branding_logo_uri: updated.branding_logo_uri ?? undefined,
    privacy_policy_uri: updated.privacy_policy_uri ?? undefined,
    terms_of_service_uri: updated.terms_of_service_uri ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
