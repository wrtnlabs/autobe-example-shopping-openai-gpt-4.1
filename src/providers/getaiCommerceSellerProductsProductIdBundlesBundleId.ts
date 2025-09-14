import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductBundle";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Get details for a specific product bundle (ai_commerce_product_bundles
 * table).
 *
 * This endpoint retrieves the complete details of a bundle, including all
 * product/variant items, pricing, metadata, and status. Used in product detail
 * pages, editing workflows, or for preparing updates. Sellers must own the
 * parent product or have explicit permission to view.
 *
 * The GET operation fully populates all relevant bundle fields per the
 * ai_commerce_product_bundles schema and provides comprehensive information for
 * decision making or editing. Errors are returned if the combination of
 * productId and bundleId does not exist or if the requester lacks
 * authorization. See also: update bundle, erase bundle, and bundle listing
 * endpoints.
 *
 * @param props - Request parameters
 * @param props.seller - Authenticated seller making the request
 * @param props.productId - The unique identifier of the parent product
 * @param props.bundleId - The unique identifier of the bundle to retrieve
 * @returns Detailed bundle entity with all related child items and metadata
 * @throws {Error} When product or bundle does not exist, or when seller does
 *   not own the product
 */
export async function getaiCommerceSellerProductsProductIdBundlesBundleId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductBundle> {
  const { seller, productId, bundleId } = props;

  // Step 1: Fetch the bundle by bundleId and productId
  const bundle = await MyGlobal.prisma.ai_commerce_product_bundles.findFirst({
    where: {
      id: bundleId,
      parent_product_id: productId,
    },
  });
  if (!bundle) {
    throw new Error("Bundle not found for the specified product.");
  }

  // Step 2: Authorize that the seller owns the parent product
  const product = await MyGlobal.prisma.ai_commerce_products.findUnique({
    where: { id: productId },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== seller.id) {
    throw new Error("Unauthorized: You do not own this product.");
  }

  // Step 3: Fetch all bundle items for the bundleId
  const items = await MyGlobal.prisma.ai_commerce_product_bundle_items.findMany(
    {
      where: { bundle_id: bundleId },
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        child_product_id: true,
        child_variant_id: true,
        item_type: true,
        quantity: true,
        required: true,
        sort_order: true,
      },
    },
  );

  // Step 4: Build and return IAiCommerceProductBundle strictly per DTO definition
  return {
    id: bundle.id,
    parent_product_id: bundle.parent_product_id,
    bundle_code: bundle.bundle_code,
    name: bundle.name,
    description: bundle.description ?? undefined,
    status: bundle.status,
    current_price: bundle.current_price,
    created_at: toISOStringSafe(bundle.created_at),
    updated_at: toISOStringSafe(bundle.updated_at),
    deleted_at:
      bundle.deleted_at !== null && bundle.deleted_at !== undefined
        ? toISOStringSafe(bundle.deleted_at)
        : undefined,
    items: items.map((item) => ({
      id: item.id,
      child_product_id: item.child_product_id ?? undefined,
      child_variant_id: item.child_variant_id ?? undefined,
      item_type: item.item_type,
      quantity: item.quantity,
      required: item.required,
      sort_order: item.sort_order,
    })),
  };
}
