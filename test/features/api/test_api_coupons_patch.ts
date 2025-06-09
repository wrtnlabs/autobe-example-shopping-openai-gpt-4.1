import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICoupon";
import { ICoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICoupon";

export async function test_api_coupons_patch(connection: api.IConnection) {
  const output: IPageICoupon = await api.functional.coupons.patch(connection, {
    body: typia.random<ICoupon.IRequest>(),
  });
  typia.assert(output);
}
