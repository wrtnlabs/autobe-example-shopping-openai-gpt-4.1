import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartItem";
import { IPageIAiCommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCartItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchaiCommerceBuyerCartsCartIdItems(props: {
  buyer: BuyerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IAiCommerceCartItem.IRequest;
}): Promise<IPageIAiCommerceCartItem.ISummary> {
  const { buyer, cartId, body } = props;

  // 1. Ownership and cart existence check
  const cart = await MyGlobal.prisma.ai_commerce_carts.findFirst({
    where: {
      id: cartId,
      buyer_id: buyer.id,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new Error(
      "Unauthorized: The specified cart does not exist or does not belong to the authenticated buyer.",
    );
  }

  // 2. Quantity / added_at filters
  let quantityFilter: Record<string, unknown> | undefined = undefined;
  if (body.min_quantity !== undefined || body.max_quantity !== undefined) {
    quantityFilter = {
      quantity: {
        ...(body.min_quantity !== undefined && { gte: body.min_quantity }),
        ...(body.max_quantity !== undefined && { lte: body.max_quantity }),
      },
    };
  }
  let addedAtFilter: Record<string, unknown> | undefined = undefined;
  if (body.added_after !== undefined || body.added_before !== undefined) {
    addedAtFilter = {
      added_at: {
        ...(body.added_after !== undefined && { gte: body.added_after }),
        ...(body.added_before !== undefined && { lte: body.added_before }),
      },
    };
  }
  // 3. Compose main filters
  const filters: Record<string, unknown> = {
    cart_id: cartId,
    deleted_at: null,
    ...(body.product_id !== undefined && { product_id: body.product_id }),
    ...(body.variant_id !== undefined && { variant_id: body.variant_id }),
    ...(quantityFilter ?? {}),
    ...(addedAtFilter ?? {}),
  };
  // 4. Paging
  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const pageSize =
    body.page_size ?? (20 as number & tags.Type<"int32"> & tags.Minimum<1>);
  // 5. Sorting
  const allowedSortFields = [
    "added_at",
    "quantity",
    "unit_price",
    "item_total",
    "updated_at",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { added_at: "desc" };
  if (body.sort_by && allowedSortFields.includes(body.sort_by)) {
    orderBy = {
      [body.sort_by]: body.sort_direction === "asc" ? "asc" : "desc",
    };
  }
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // 6. Query
  const [items, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_cart_items.findMany({
      where: filters,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        product_id: true,
        quantity: true,
        unit_price: true,
        item_total: true,
        added_at: true,
        updated_at: true,
        variant_id: true,
        product: { select: { name: true } },
        variant: { select: { option_summary: true } },
      },
    }),
    MyGlobal.prisma.ai_commerce_cart_items.count({ where: filters }),
  ]);

  // 7. Map to DTO type
  const data = items.map((item) => {
    const summary: IAiCommerceCartItem.ISummary = {
      id: item.id,
      product_id: item.product_id,
      product_name: item.product ? item.product.name : "",
      quantity: item.quantity as number & tags.Type<"int32">,
      unit_price: item.unit_price,
      item_total: item.item_total,
      // logic: if item.deleted_at is not null, mark as "deleted"; else active.
      status: "active",
      added_at: toISOStringSafe(item.added_at),
      updated_at: toISOStringSafe(item.updated_at),
      ...(item.variant_id !== null &&
        item.variant_id !== undefined && {
          variant_id: item.variant_id,
        }),
      ...(item.variant &&
        item.variant.option_summary !== null &&
        item.variant.option_summary !== undefined && {
          option_summary: item.variant.option_summary,
        }),
    };
    return summary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / Number(pageSize)),
    },
    data,
  };
}
