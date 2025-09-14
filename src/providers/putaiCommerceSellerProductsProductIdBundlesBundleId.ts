import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductBundle";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Update an existing product bundle for a product (ai_commerce_product_bundles
 * table).
 *
 * This endpoint allows a seller to update the metadata, price, and bundle
 * composition of an existing bundle under a specific product. Seller must be
 * the owner of the product/bundle. Input is validated strictly against business
 * rules and type safety. The operation checks permission, uniqueness of
 * bundle_code, and applies a patch-like update. If the 'items' array is
 * provided, it performs a full upsert (create, update, delete) for bundle items
 * within this bundle. Returns the updated bundle with all date fields as
 * branded ISO strings.
 *
 * @param props - Parameters for the operation.
 * @param props.seller - The authenticated seller making the update (must own
 *   the product).
 * @param props.productId - The UUID of the product owning the bundle.
 * @param props.bundleId - The UUID of the bundle to update.
 * @param props.body - Update fields for the bundle (may partially or fully
 *   update any updatable fields).
 * @returns The updated IAiCommerceProductBundle with all provided changes
 *   applied and full schema accuracy.
 * @throws {Error} If permission denied, bundle/product not found, or
 *   bundle_code is duplicated.
 */
export async function putaiCommerceSellerProductsProductIdBundlesBundleId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bundleId: string & tags.Format<"uuid">;
  body: IAiCommerceProductBundle.IUpdate;
}): Promise<IAiCommerceProductBundle> {
  const { seller, productId, bundleId, body } = props;

  // 1. Fetch product and verify seller is owner
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
    },
  });
  if (!product || product.seller_id !== seller.id) {
    throw new Error(
      "You do not have permission to update this product bundle.",
    );
  }

  // 2. Fetch bundle and verify product linkage
  const bundle = await MyGlobal.prisma.ai_commerce_product_bundles.findFirst({
    where: {
      id: bundleId,
      parent_product_id: productId,
      deleted_at: null,
    },
  });
  if (!bundle) {
    throw new Error("Product bundle not found or not under specified product.");
  }

  // 3. If bundle_code is provided and changed, check for uniqueness
  if (body.bundle_code && body.bundle_code !== bundle.bundle_code) {
    const exists = await MyGlobal.prisma.ai_commerce_product_bundles.findFirst({
      where: {
        bundle_code: body.bundle_code,
        id: { not: bundleId },
      },
    });
    if (exists) throw new Error("Duplicate bundle_code");
  }

  // 4. Update the bundle with provided fields and updated_at
  const updated = await MyGlobal.prisma.ai_commerce_product_bundles.update({
    where: { id: bundleId },
    data: {
      bundle_code: body.bundle_code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      status: body.status ?? undefined,
      current_price: body.current_price ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 5. Upsert bundle items if supplied
  if (body.items) {
    // Fetch existing bundle items for this bundle
    const existingItems =
      await MyGlobal.prisma.ai_commerce_product_bundle_items.findMany({
        where: { bundle_id: bundleId },
        select: { id: true },
      });
    const inputIds = body.items
      .map((i) => i.id)
      .filter((id): id is string => Boolean(id));
    // Update or create bundle items from input
    for (const input of body.items) {
      if (input.id) {
        // Update if exists
        await MyGlobal.prisma.ai_commerce_product_bundle_items.update({
          where: { id: input.id },
          data: {
            child_product_id: input.child_product_id ?? undefined,
            child_variant_id: input.child_variant_id ?? undefined,
            item_type: input.item_type ?? undefined,
            quantity: input.quantity ?? undefined,
            required: input.required ?? undefined,
            sort_order: input.sort_order ?? undefined,
          },
        });
      } else {
        // Create new
        await MyGlobal.prisma.ai_commerce_product_bundle_items.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            bundle_id: bundleId,
            child_product_id: input.child_product_id ?? undefined,
            child_variant_id: input.child_variant_id ?? undefined,
            item_type: input.item_type ?? "",
            quantity: input.quantity ?? 1,
            required: input.required ?? false,
            sort_order: input.sort_order ?? 1,
          },
        });
      }
    }
    // Delete items not in the update payload
    for (const existing of existingItems) {
      if (!inputIds.includes(existing.id)) {
        await MyGlobal.prisma.ai_commerce_product_bundle_items.delete({
          where: { id: existing.id },
        });
      }
    }
  }

  // 6. Fetch updated bundle and its bundle items
  const full = await MyGlobal.prisma.ai_commerce_product_bundles.findFirst({
    where: { id: bundleId },
    include: { ai_commerce_product_bundle_items: true },
  });
  if (!full) throw new Error("Failed to reload updated bundle.");

  // 7. Map result to DTO shape, strictly convert all date fields
  return {
    id: full.id,
    parent_product_id: full.parent_product_id,
    bundle_code: full.bundle_code,
    name: full.name,
    description: full.description ?? undefined,
    status: full.status,
    current_price: full.current_price,
    created_at: toISOStringSafe(full.created_at),
    updated_at: toISOStringSafe(full.updated_at),
    deleted_at: full.deleted_at ? toISOStringSafe(full.deleted_at) : undefined,
    items: (full.ai_commerce_product_bundle_items ?? []).map((item) => ({
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
