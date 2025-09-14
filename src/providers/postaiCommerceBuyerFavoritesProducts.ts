import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesProducts } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProducts";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new product favorite and return the record with snapshot and folder
 * data.
 *
 * This operation allows an authenticated buyer to favorite a product. It
 * enforces uniqueness on (buyer, product), fetches the target product for
 * snapshotting, creates a point-in-time snapshot, and saves the favorite
 * association. Only an authenticated, active buyer can call this endpoint; on
 * duplicate favorite or missing product, an error is thrown. All timestamps and
 * UUIDs are handled consistently per strict contract; type assertions and
 * native Date are forbidden.
 *
 * @param props - Properties for the creation request
 * @param props.buyer - Authenticated buyer payload
 * @param props.body - Request body according to
 *   IAiCommerceFavoritesProducts.ICreate (requires product_id, optional label
 *   and folder_id)
 * @returns IAiCommerceFavoritesProducts - The created favorite, with snapshot
 *   and metadata
 * @throws {Error} If the favorite already exists, or the product does not exist
 *   or is inactive
 */
export async function postaiCommerceBuyerFavoritesProducts(props: {
  buyer: BuyerPayload;
  body: IAiCommerceFavoritesProducts.ICreate;
}): Promise<IAiCommerceFavoritesProducts> {
  const { buyer, body } = props;

  // 1. Check uniqueness: Must not already have a favorite for this user/product
  const duplicate =
    await MyGlobal.prisma.ai_commerce_favorites_products.findUnique({
      where: {
        user_id_product_id: {
          user_id: buyer.id,
          product_id: body.product_id,
        },
      },
    });
  if (duplicate)
    throw new Error("Favorite already exists for this product and user.");

  // 2. Fetch the product (must exist and not deleted)
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: body.product_id,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      current_price: true,
      status: true,
    },
  });
  if (!product) throw new Error("Product not found.");

  // 3. Create point-in-time snapshot
  const snapshot_id = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ai_commerce_favorites_product_snapshots.create({
    data: {
      id: snapshot_id,
      product_id: product.id,
      name: product.name,
      description: product.description,
      price: product.current_price,
      available: product.status === "active",
      snapshot_date: now,
    },
  });

  // 4. Create favorite
  const favorite_id = v4() as string & tags.Format<"uuid">;
  const created = await MyGlobal.prisma.ai_commerce_favorites_products.create({
    data: {
      id: favorite_id,
      user_id: buyer.id,
      product_id: body.product_id,
      folder_id: body.folder_id ?? null,
      snapshot_id: snapshot_id,
      label: body.label ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Return output matching IAiCommerceFavoritesProducts (no as, handle null/undefined on optional fields)
  return {
    id: created.id,
    product_id: created.product_id,
    label:
      created.label !== null && created.label !== undefined
        ? created.label
        : undefined,
    folder_id:
      created.folder_id !== null && created.folder_id !== undefined
        ? created.folder_id
        : undefined,
    snapshot_id: created.snapshot_id,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? created.deleted_at
        : undefined,
  };
}
