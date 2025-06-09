import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPayment";
import { IPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPayment";

export async function test_api_payments_patch(connection: api.IConnection) {
  const output: IPageIPayment = await api.functional.payments.patch(
    connection,
    {
      body: typia.random<IPayment.IRequest>(),
    },
  );
  typia.assert(output);
}
