import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductVariant";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new variant/option under a given product for inventory/sales
 * management.
 *
 * This operation allows an admin to register a variant for a specific product
 * (specified by productId) by supplying SKU, options summary, price, inventory
 * quantity, and operational status. The new variant is attached to the parent
 * product, enforcing unique constraint for SKU within the product scope and
 * inheritance of the product's context. The function prevents use of the native
 * Date type, uses only ISO date strings, and ensures full type safety per DTO.
 * Soft delete (deleted_at) is explicitly handled. Duplicate SKU creation or
 * invalid/mismatched product IDs will result in a thrown Error.
 *
 * @param props - The input parameters for variant creation.
 * @param props.admin - The authenticated admin creating the variant; must be
 *   present and active associate.
 * @param props.productId - UUID of the product to which the variant will be
 *   linked. Must match the product_id in request body and reference a real,
 *   non-deleted product.
 * @param props.body - Variant registration details
 *   (IAiCommerceProductVariant.ICreate): SKU, option summary, variant price,
 *   inventory count, and status.
 * @returns The newly created IAiCommerceProductVariant DTO with all timestamps
 *   and fields filled.
 * @throws {Error} If the product does not exist, is deleted, or product_id/body
 *   mismatch. Throws for Prisma duplicate SKU code P2002 or other database
 *   errors.
 */
export async function postaiCommerceAdminProductsProductIdVariants(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductVariant.ICreate;
}): Promise<IAiCommerceProductVariant> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const { admin, productId, body } = props;

  // 1. Validate the parent product exists and is not soft-deleted
  const parentProduct = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId, deleted_at: null },
    select: { id: true },
  });
  if (!parentProduct) {
    throw new Error("Specified product does not exist or is deleted.");
  }

  // 2. Enforce that path productId and body.product_id match
  if (body.product_id !== productId) {
    throw new Error("Body.product_id must match path productId.");
  }

  // 3. Attempt to create the variant
  let created;
  try {
    created = await MyGlobal.prisma.ai_commerce_product_variants.create({
      data: {
        id: v4(),
        product_id: body.product_id,
        sku_code: body.sku_code,
        option_summary: body.option_summary,
        variant_price: body.variant_price,
        inventory_quantity: body.inventory_quantity,
        status: body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("SKU code must be unique per product.");
    }
    throw err;
  }

  return {
    id: created.id,
    product_id: created.product_id,
    sku_code: created.sku_code,
    option_summary: created.option_summary,
    variant_price: created.variant_price,
    inventory_quantity: created.inventory_quantity,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
