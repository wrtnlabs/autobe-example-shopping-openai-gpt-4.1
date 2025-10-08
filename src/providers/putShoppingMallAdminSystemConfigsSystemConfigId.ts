import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
  body: IShoppingMallSystemConfig.IUpdate;
}): Promise<IShoppingMallSystemConfig> {
  const { systemConfigId, body } = props;
  // Step 1: Find config (404 if not found or soft-deleted)
  const existing = await MyGlobal.prisma.shopping_mall_system_configs.findFirst(
    {
      where: {
        id: systemConfigId,
        deleted_at: null,
      },
    },
  );
  if (!existing) {
    throw new HttpException(
      "Not Found: System configuration does not exist",
      404,
    );
  }
  // Step 2: Update only provided fields, always update updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_system_configs.update({
    where: { id: systemConfigId },
    data: {
      config_key: body.config_key ?? undefined,
      config_scope: body.config_scope ?? undefined,
      value_type: body.value_type ?? undefined,
      string_value: body.string_value ?? undefined,
      int_value: body.int_value ?? undefined,
      double_value: body.double_value ?? undefined,
      boolean_value: body.boolean_value ?? undefined,
      json_value: body.json_value ?? undefined,
      updated_at: now,
    },
  });
  // Step 3: Map result to DTO type
  return {
    id: updated.id,
    config_key: updated.config_key,
    config_scope: updated.config_scope,
    value_type: updated.value_type,
    string_value: updated.string_value ?? null,
    int_value: updated.int_value ?? null,
    double_value: updated.double_value ?? null,
    boolean_value: updated.boolean_value ?? null,
    json_value: updated.json_value ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
