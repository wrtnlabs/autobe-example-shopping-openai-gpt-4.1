import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAnalyticsAiProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAnalyticsAiProvider";
import { IAnalyticsAiProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsAiProvider";

export async function test_api_aiProvider_patch(connection: api.IConnection) {
  const output: IPageIAnalyticsAiProvider =
    await api.functional.aiProvider.patch(connection, {
      body: typia.random<IAnalyticsAiProvider.IRequest>(),
    });
  typia.assert(output);
}
