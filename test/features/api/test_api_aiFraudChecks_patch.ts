import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAIFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIFraudCheck";
import { IAIFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIFraudCheck";

export async function test_api_aiFraudChecks_patch(
  connection: api.IConnection,
) {
  const output: IPageIAIFraudCheck = await api.functional.aiFraudChecks.patch(
    connection,
    {
      body: typia.random<IAIFraudCheck.IRequest>(),
    },
  );
  typia.assert(output);
}
