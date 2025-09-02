import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileage";
import { IPageIShoppingMallAiBackendMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendMileage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and retrieve all mileage ledgers (with search and paging).
 *
 * Returns a paginated, filterable index of all mileage ledgers for the
 * requester (customer). Only the authenticated customer's ledgers are included;
 * seller/admin-ledgers are not visible here. This endpoint is core to user
 * profile dashboards and loyalty analytics. Results include summary (id, usable
 * balance, creation time), with pagination as per UI/UX/api spec.
 *
 * @param props - Request object
 * @param props.customer - The authenticated customer context; only their
 *   ledgers are shown
 * @param props.body - Request parameters for pagination: page (default 1),
 *   limit (default 20)
 * @returns Paginated list and summary for each mileage ledger
 * @throws {Error} On authentication context missing, or database access failure
 */
export async function patch__shoppingMallAiBackend_customer_mileages(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendMileage.IRequest;
}): Promise<IPageIShoppingMallAiBackendMileage.ISummary> {
  const { customer, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const [ledgers, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_mileages.findMany({
      where: {
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_mileages.count({
      where: {
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(limit) === 0 ? 0 : Math.ceil(Number(total) / Number(limit)),
    },
    data: ledgers.map((ledger) => ({
      id: ledger.id,
      usable_mileage: ledger.usable_mileage,
      created_at: toISOStringSafe(ledger.created_at),
    })),
  };
}
