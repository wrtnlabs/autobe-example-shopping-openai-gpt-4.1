import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPayment";

export async function test_api_payments_putById(connection: api.IConnection) {
  const output: IPayment = await api.functional.payments.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IPayment.IUpdate>(),
  });
  typia.assert(output);
}
