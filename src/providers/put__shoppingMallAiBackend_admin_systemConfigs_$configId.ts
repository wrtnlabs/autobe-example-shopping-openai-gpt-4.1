import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing global system configuration by configId.
 *
 * Update an existing global system configuration entry using its configId. The
 * update can modify key, value, description, or scheduling time bounds. Used by
 * authorized administrators to dynamically adjust business rules and system
 * properties with full audit and rollback support. Only users with
 * system/config privileges allowed. Changes are reflected in system operations
 * immediately.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin with config privileges
 * @param props.configId - Unique identifier for the configuration entry (UUID)
 * @param props.body - Partial update input (fields to modify)
 * @returns Updated config record after applying changes
 * @throws {Error} If system config does not exist or is soft-deleted
 */
export async function put__shoppingMallAiBackend_admin_systemConfigs_$configId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendSystemConfig.IUpdate;
}): Promise<IShoppingMallAiBackendSystemConfig> {
  const { admin, configId, body } = props;

  // Step 1: Authorization already enforced by decorator (admin presence)

  // Step 2: Ensure config exists (and not soft deleted)
  const config =
    await MyGlobal.prisma.shopping_mall_ai_backend_system_configs.findFirst({
      where: { id: configId, deleted_at: null },
    });
  if (!config) throw new Error("System config not found");

  // Step 3: Build update patch (skip not-present fields, always update updated_at)
  const now = toISOStringSafe(new Date());
  const updateData = {
    key: body.key ?? undefined,
    value: body.value ?? undefined,
    description: body.description ?? undefined,
    effective_from: body.effective_from ?? undefined,
    effective_to: body.effective_to ?? undefined,
    updated_at: now,
  };

  // Step 4: Perform update
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_system_configs.update({
      where: { id: configId },
      data: updateData,
    });

  // Step 5: Return all fields (brand/convert dates)
  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? null,
    effective_from: updated.effective_from
      ? toISOStringSafe(updated.effective_from)
      : null,
    effective_to: updated.effective_to
      ? toISOStringSafe(updated.effective_to)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
