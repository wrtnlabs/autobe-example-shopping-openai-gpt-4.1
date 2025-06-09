import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFraudCheck";
import { IFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IFraudCheck";

export async function test_api_fraudCheck_patch(connection: api.IConnection) {
  const output: IPageIFraudCheck = await api.functional.fraudCheck.patch(
    connection,
    {
      body: typia.random<IFraudCheck.IRequest>(),
    },
  );
  typia.assert(output);
}
