import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICoupon";

export async function test_api_coupons_post(connection: api.IConnection) {
  const output: ICoupon = await api.functional.coupons.post(connection, {
    body: typia.random<ICoupon.ICreate>(),
  });
  typia.assert(output);
}
