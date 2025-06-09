import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPayment";

export async function test_api_payments_post(connection: api.IConnection) {
  const output: IPayment = await api.functional.payments.post(connection, {
    body: typia.random<IPayment.ICreate>(),
  });
  typia.assert(output);
}
