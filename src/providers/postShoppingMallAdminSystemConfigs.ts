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

export async function postShoppingMallAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemConfig.ICreate;
}): Promise<IShoppingMallSystemConfig> {
  const { admin, body } = props;
  // 1. Check for duplicate (config_key, config_scope)
  const dup = await MyGlobal.prisma.shopping_mall_system_configs.findFirst({
    where: {
      config_key: body.config_key,
      config_scope: body.config_scope,
      deleted_at: null,
    },
  });
  if (dup !== null) {
    throw new HttpException("Duplicate configuration key and scope", 409);
  }

  const now = toISOStringSafe(new Date());

  // Only one value field is set according to value_type, others null
  let string_value: string | null = null;
  let int_value: number | null = null;
  let double_value: number | null = null;
  let boolean_value: boolean | null = null;
  let json_value: string | null = null;

  if (body.value_type === "string") {
    string_value = body.string_value ?? null;
  } else if (body.value_type === "int") {
    int_value = body.int_value ?? null;
  } else if (body.value_type === "double") {
    double_value = body.double_value ?? null;
  } else if (body.value_type === "boolean") {
    boolean_value = body.boolean_value ?? null;
  } else if (body.value_type === "json") {
    json_value = body.json_value ?? null;
  }

  const created = await MyGlobal.prisma.shopping_mall_system_configs.create({
    data: {
      id: v4(),
      config_key: body.config_key,
      config_scope: body.config_scope,
      value_type: body.value_type,
      string_value,
      int_value,
      double_value,
      boolean_value,
      json_value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    config_key: created.config_key,
    config_scope: created.config_scope,
    value_type: created.value_type,
    string_value: created.string_value ?? null,
    int_value: created.int_value ?? null,
    double_value: created.double_value ?? null,
    boolean_value: created.boolean_value ?? null,
    json_value: created.json_value ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
