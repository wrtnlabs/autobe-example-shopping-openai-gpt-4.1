import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific product snapshot (ai_commerce_product_snapshots).
 *
 * This endpoint retrieves a single immutable snapshot representing a product's
 * state at a specific point in time (such as after creation, update, or
 * compliance review). Only authenticated admins may access this record.
 *
 * @param props - Parameters for the request
 * @param props.admin - The authenticated admin user making the request
 * @param props.productId - UUID of the product whose snapshot is requested
 * @param props.snapshotId - UUID of the specific product snapshot to retrieve
 * @returns The immutable IAiCommerceProductSnapshot matching snapshotId +
 *   productId
 * @throws {Error} When no matching product snapshot is found
 */
export async function getaiCommerceAdminProductsProductIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductSnapshot> {
  const { admin, productId, snapshotId } = props;
  // Authorization is enforced by decorator; admin param retained for audit rigor
  const snapshot =
    await MyGlobal.prisma.ai_commerce_product_snapshots.findFirst({
      where: {
        id: snapshotId,
        product_id: productId,
      },
    });
  if (!snapshot) {
    throw new Error("Product snapshot not found");
  }
  return {
    id: snapshot.id,
    product_id: snapshot.product_id,
    event_type: snapshot.event_type,
    actor_id: snapshot.actor_id,
    snapshot_json: snapshot.snapshot_json,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
