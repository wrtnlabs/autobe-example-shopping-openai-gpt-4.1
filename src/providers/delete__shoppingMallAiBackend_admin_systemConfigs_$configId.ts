import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently remove a system configuration entry by its configId from
 * shopping_mall_ai_backend_system_configs.
 *
 * This operation performs a hard delete (irreversible physical deletion) of a
 * system configuration entry, ensuring the specified configId is completely
 * removed from the platform and business logic. Designed for system
 * administrators overseeing global settings, this method strictly requires
 * admin-level authentication. If the configuration does not exist, an error is
 * thrown. No soft delete or deleted_at logic applies; the row is removed from
 * the database. This action is irreversible—ensure audit trails are managed
 * separately.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.configId - UUID of the system configuration entry to delete
 * @returns Void (no return value)
 * @throws {Error} If the configuration entry does not exist or has already been
 *   deleted
 */
export async function delete__shoppingMallAiBackend_admin_systemConfigs_$configId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, configId } = props;
  // Confirm the entry exists before deletion to provide a clear error (404)
  const config =
    await MyGlobal.prisma.shopping_mall_ai_backend_system_configs.findUnique({
      where: { id: configId },
    });
  if (!config) {
    throw new Error("System configuration not found");
  }
  // Hard delete (completely remove the record)
  await MyGlobal.prisma.shopping_mall_ai_backend_system_configs.delete({
    where: { id: configId },
  });
  // Operation is void
}
