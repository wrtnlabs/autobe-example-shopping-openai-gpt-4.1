import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFile";

export async function test_api_admin_file_metadata_update(
  connection: api.IConnection,
) {
  /**
   * 파일 메타데이터 관리(관리자 권한) E2E 검증
   *
   * - 관리자 인증 후 파일 메타데이터를 등록한다
   * - 파일 original_filename, mime_type, storage_uri 등 일부 필드 업데이트 성공을 확인한다
   * - 존재하지 않는 fileId로 업데이트(존재하지 않는 리소스 접근) 오류를 검증한다
   * - 다른 파일의 storage_uri와 중복된 값으로 업데이트 시도(고유성 위반) 오류를 검증한다
   * - Soft delete(논리삭제)된 파일의 fileId로 업데이트 시도(비즈니스 규칙상 거부) 오류를 검증한다
   */
  // 1. 관리자 계정 생성 및 인증
  const adminInput = {
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. 테스트용 파일 메타데이터 신규 등록
  const fileInput = {
    original_filename: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    mime_type: "image/png",
    storage_uri: `s3://bucket/${RandomGenerator.alphaNumeric(12)}`,
    size_bytes: typia.random<number & tags.Type<"int32">>(),
    uploaded_by_id: adminAuth.admin.id,
    uploaded_at: new Date().toISOString(),
  } satisfies IShoppingMallAiBackendFile.ICreate;
  const file = await api.functional.shoppingMallAiBackend.admin.files.create(
    connection,
    { body: fileInput },
  );
  typia.assert(file);

  // 3. 정상 업데이트 케이스(이름, 타입, uri 변경)
  const updateInput = {
    original_filename: RandomGenerator.paragraph({ sentences: 3 }),
    mime_type: "image/jpeg",
    storage_uri: `s3://bucket/${RandomGenerator.alphaNumeric(14)}`,
    size_bytes: file.size_bytes + 10,
  } satisfies IShoppingMallAiBackendFile.IUpdate;
  const updated = await api.functional.shoppingMallAiBackend.admin.files.update(
    connection,
    {
      fileId: file.id,
      body: updateInput,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "original_filename 필드가 정상적으로 업데이트되어야 함",
    updated.original_filename,
    updateInput.original_filename,
  );
  TestValidator.equals(
    "mime_type 필드가 정상적으로 업데이트되어야 함",
    updated.mime_type,
    updateInput.mime_type,
  );
  TestValidator.equals(
    "storage_uri 필드가 정상적으로 업데이트되어야 함",
    updated.storage_uri,
    updateInput.storage_uri,
  );
  TestValidator.equals(
    "size_bytes 필드가 정상적으로 업데이트되어야 함",
    updated.size_bytes,
    updateInput.size_bytes,
  );

  // 4. 존재하지 않는 fileId로 업데이트 시도(404 또는 미존재 케이스)
  const nonExistFileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "존재하지 않는 fileId로 업데이트 시 404 에러 발생해야 함",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.update(
        connection,
        {
          fileId: nonExistFileId,
          body: {
            original_filename: "no-such-file",
          } satisfies IShoppingMallAiBackendFile.IUpdate,
        },
      );
    },
  );

  // 5. storage_uri 중복(유일성 위반) 업데이트 케이스
  const anotherFileInput = {
    original_filename: RandomGenerator.paragraph({ sentences: 2 }),
    mime_type: "application/pdf",
    storage_uri: `s3://bucket/${RandomGenerator.alphaNumeric(12)}`,
    size_bytes: typia.random<number & tags.Type<"int32">>(),
    uploaded_by_id: adminAuth.admin.id,
    uploaded_at: new Date().toISOString(),
  } satisfies IShoppingMallAiBackendFile.ICreate;
  const anotherFile =
    await api.functional.shoppingMallAiBackend.admin.files.create(connection, {
      body: anotherFileInput,
    });
  typia.assert(anotherFile);

  await TestValidator.error(
    "다른 파일의 storage_uri와 중복된 값으로 업데이트시 에러",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.update(
        connection,
        {
          fileId: file.id,
          body: {
            storage_uri: anotherFile.storage_uri,
          } satisfies IShoppingMallAiBackendFile.IUpdate,
        },
      );
    },
  );

  // 6. soft delete(논리삭제)된 파일에 대한 업데이트 거부
  const deletedAt = new Date().toISOString();
  const softDeleted =
    await api.functional.shoppingMallAiBackend.admin.files.update(connection, {
      fileId: anotherFile.id,
      body: {
        deleted_at: deletedAt,
      } satisfies IShoppingMallAiBackendFile.IUpdate,
    });
  typia.assert(softDeleted);
  TestValidator.equals(
    "soft delete 수행 후 deleted_at 값이 정상 반영되어야 함",
    softDeleted.deleted_at,
    deletedAt,
  );

  await TestValidator.error(
    "soft delete된 파일에 대해 업데이트 시 거부되어야 함",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.update(
        connection,
        {
          fileId: anotherFile.id,
          body: {
            original_filename: "updated-after-delete",
          } satisfies IShoppingMallAiBackendFile.IUpdate,
        },
      );
    },
  );
}
