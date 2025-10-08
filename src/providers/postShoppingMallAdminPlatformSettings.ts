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

export async function postShoppingMallAdminPlatformSettings(props: {
  admin: AdminPayload;
  body: IShoppingMallPlatformSettings.ICreate;
}): Promise<IShoppingMallPlatformSettings> {
  // Singleton check: Fail if any active setting exists
  const existing =
    await MyGlobal.prisma.shopping_mall_platform_settings.findFirst({
      where: { deleted_at: null },
      select: { id: true },
    });
  if (existing) {
    throw new HttpException(
      "Platform settings already exist (singleton enforced)",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_platform_settings.create({
    data: {
      id: v4(),
      site_title_ko: props.body.site_title_ko,
      site_title_en: props.body.site_title_en,
      site_description_ko: props.body.site_description_ko ?? null,
      site_description_en: props.body.site_description_en ?? null,
      support_email: props.body.support_email ?? null,
      support_phone: props.body.support_phone ?? null,
      branding_logo_uri: props.body.branding_logo_uri ?? null,
      privacy_policy_uri: props.body.privacy_policy_uri ?? null,
      terms_of_service_uri: props.body.terms_of_service_uri ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    site_title_ko: created.site_title_ko,
    site_title_en: created.site_title_en,
    site_description_ko: created.site_description_ko ?? undefined,
    site_description_en: created.site_description_en ?? undefined,
    support_email: created.support_email ?? undefined,
    support_phone: created.support_phone ?? undefined,
    branding_logo_uri: created.branding_logo_uri ?? undefined,
    privacy_policy_uri: created.privacy_policy_uri ?? undefined,
    terms_of_service_uri: created.terms_of_service_uri ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
