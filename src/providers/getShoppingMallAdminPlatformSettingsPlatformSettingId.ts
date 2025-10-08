import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminPlatformSettingsPlatformSettingId(props: {
  admin: AdminPayload;
  platformSettingId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPlatformSetting> {
  const record =
    await MyGlobal.prisma.shopping_mall_platform_settings.findFirst({
      where: {
        id: props.platformSettingId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new HttpException("Platform setting not found", 404);
  }
  return {
    id: record.id,
    site_title_ko: record.site_title_ko,
    site_title_en: record.site_title_en,
    site_description_ko: record.site_description_ko ?? null,
    site_description_en: record.site_description_en ?? null,
    support_email: record.support_email ?? null,
    support_phone: record.support_phone ?? null,
    branding_logo_uri: record.branding_logo_uri ?? null,
    privacy_policy_uri: record.privacy_policy_uri ?? null,
    terms_of_service_uri: record.terms_of_service_uri ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
