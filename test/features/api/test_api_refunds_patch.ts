import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRefund";
import { IRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefund";

export async function test_api_refunds_patch(connection: api.IConnection) {
  const output: IPageIRefund = await api.functional.refunds.patch(connection, {
    body: typia.random<IRefund.IRequest>(),
  });
  typia.assert(output);
}
