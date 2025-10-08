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

export async function getShoppingMallAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSystemConfig> {
  const config = await MyGlobal.prisma.shopping_mall_system_configs.findUnique({
    where: { id: props.systemConfigId, deleted_at: null },
  });
  if (config == null) {
    throw new HttpException("System configuration not found", 404);
  }
  return {
    id: config.id,
    config_key: config.config_key,
    config_scope: config.config_scope,
    value_type: config.value_type,
    string_value: config.string_value ?? null,
    int_value: config.int_value ?? null,
    double_value: config.double_value ?? null,
    boolean_value: config.boolean_value ?? null,
    json_value: config.json_value ?? null,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  };
}
