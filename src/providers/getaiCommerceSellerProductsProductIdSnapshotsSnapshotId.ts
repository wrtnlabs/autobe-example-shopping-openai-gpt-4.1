import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSnapshot";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific product snapshot (ai_commerce_product_snapshots).
 *
 * Retrieves the full details of a single immutable historical product snapshot
 * from ai_commerce_product_snapshots for a given product and snapshot id. Only
 * authorized sellers can access this record. The returned
 * IAiCommerceProductSnapshot object contains all data at the snapshot point,
 * including the triggering event, actor, and full denormalized state.
 *
 * Authorization: The caller must be the seller who owns the referenced product.
 * If the caller does not own the product, an error is thrown.
 *
 * @param props - The props object containing:
 *
 *   - Seller: SellerPayload (authenticated seller)
 *   - ProductId: string & tags.Format<'uuid'> (UUID of the product)
 *   - SnapshotId: string & tags.Format<'uuid'> (UUID of the snapshot to retrieve)
 *
 * @returns IAiCommerceProductSnapshot containing the full immutable snapshot
 *   details
 * @throws {Error} If the snapshot does not exist or if the seller is
 *   unauthorized
 */
export async function getaiCommerceSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductSnapshot> {
  const { seller, productId, snapshotId } = props;

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

  // Authorization: ensure this seller owns the product
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
    },
  });
  if (!product) {
    throw new Error("You do not have permission to access this product");
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
