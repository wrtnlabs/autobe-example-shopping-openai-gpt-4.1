import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductBundle";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new product bundle for a product (ai_commerce_product_bundles
 * table).
 *
 * This operation enables sellers to create a new product bundle (composite
 * product) under their own product. Each bundle includes a unique bundle_code,
 * descriptive fields, pricing, and a list of child items (such as products or
 * variants). The operation ensures the requesting seller owns the parent
 * product and that the bundle_code is globally unique. All entity creation is
 * performed atomically in a transaction. Errors are raised for unauthorized
 * product access, duplicate bundle_code, or any transaction failures. All
 * date/time fields are handled as proper ISO-8601 date-time branded strings.
 *
 * @param props - Request parameters and payload
 * @param props.seller - JWT-authenticated seller payload (must own the parent
 *   product)
 * @param props.productId - UUID of the parent product
 * @param props.body - Bundle creation details (code, name, description, items)
 * @returns The created product bundle object, including its item composition
 * @throws {Error} If the product does not exist, does not belong to seller, or
 *   is soft-deleted
 * @throws {Error} If the bundle_code already exists
 * @throws {Error} On database transaction or fetch failures
 */
export async function postaiCommerceSellerProductsProductIdBundles(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductBundle.ICreate;
}): Promise<IAiCommerceProductBundle> {
  const { seller, productId, body } = props;

  // Authorization: Only product owners can create bundles
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new Error(
      "Forbidden: You do not own this product or it does not exist",
    );
  }

  // bundle_code must be unique
  const duplicateBundle =
    await MyGlobal.prisma.ai_commerce_product_bundles.findFirst({
      where: {
        bundle_code: body.bundle_code,
      },
      select: { id: true },
    });
  if (duplicateBundle) {
    throw new Error("A bundle with this code already exists");
  }

  // Prepare core fields (no Date usage)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const bundleId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  const bundleData = {
    id: bundleId,
    parent_product_id: productId,
    bundle_code: body.bundle_code,
    name: body.name,
    description: body.description ?? undefined,
    status: body.status,
    current_price: body.current_price,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies Omit<IAiCommerceProductBundle, "items">;

  // Prepare each bundle item
  const itemsData = body.items.map((item) => ({
    id: v4() as string & tags.Format<"uuid">,
    bundle_id: bundleId,
    child_product_id: item.child_product_id ?? undefined,
    child_variant_id: item.child_variant_id ?? undefined,
    item_type: item.item_type,
    quantity: item.quantity,
    required: item.required,
    sort_order: item.sort_order,
  }));

  // Transaction for atomic creation
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ai_commerce_product_bundles.create({ data: bundleData }),
    ...itemsData.map((data) =>
      MyGlobal.prisma.ai_commerce_product_bundle_items.create({ data }),
    ),
  ]);

  // Load created bundle and all items (no Date types)
  const created = await MyGlobal.prisma.ai_commerce_product_bundles.findFirst({
    where: { id: bundleId },
    include: { ai_commerce_product_bundle_items: true },
  });
  if (!created)
    throw new Error("Internal error: Could not load created bundle");

  // Compose result with strict type compliance and date branding
  const result = {
    id: created.id,
    parent_product_id: created.parent_product_id,
    bundle_code: created.bundle_code,
    name: created.name,
    description: created.description ?? undefined,
    status: created.status,
    current_price: created.current_price,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    items: created.ai_commerce_product_bundle_items.map((item) => ({
      id: item.id,
      child_product_id: item.child_product_id ?? undefined,
      child_variant_id: item.child_variant_id ?? undefined,
      item_type: item.item_type,
      quantity: item.quantity,
      required: item.required,
      sort_order: item.sort_order,
    })),
  } satisfies IAiCommerceProductBundle;

  return result;
}
