// @ts-nocheck
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

import { attachmentObjectPath, ATTACHMENT_BUCKET } from "@/lib/crm-config.functions";
import { MEDICAL_AUDIT_ACTIONS, medicalAuditLabel } from "@/lib/medical-audit";
import en from "@/lib/i18n/en";
import kaa from "@/lib/i18n/kaa";
import ru from "@/lib/i18n/ru";

const BUSINESS = "11111111-1111-4111-8111-111111111111";

describe("crm record attachments", () => {
  test("the object path always starts with the caller's own business", () => {
    const path = attachmentObjectPath({
      businessId: BUSINESS,
      moduleKey: "rentgen",
      filename: "panorama.png",
      contentType: "image/png",
      id: "abc",
    });
    expect(path).toBe(`${BUSINESS}/rentgen/abc/panorama.png`);
    expect(path.split("/")[0]).toBe(BUSINESS);
  });

  test("the stored extension comes from the content type, not the filename", () => {
    const path = attachmentObjectPath({
      businessId: BUSINESS,
      moduleKey: "tahlillar",
      filename: "natija.png.exe",
      contentType: "application/pdf",
      id: "abc",
    });
    expect(path.endsWith(".pdf")).toBe(true);
  });

  test("path separators and traversal in the filename cannot escape the tenant folder", () => {
    const path = attachmentObjectPath({
      businessId: BUSINESS,
      moduleKey: "hujjatlar",
      filename: "../../oye/2-kard_fayl.txt",
      contentType: "image/jpeg",
      id: "abc",
    });
    expect(path.split("/")).toHaveLength(4);
    expect(path).toContain(`${BUSINESS}/hujjatlar/abc/`);
  });

  test("only document and image types are accepted", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/tiff", "application/pdf"]) {
      expect(attachmentObjectPath({ businessId: BUSINESS, moduleKey: "m", filename: "a", contentType: type, id: "i" })).not.toBeNull();
    }
    for (const type of ["application/x-msdownload", "text/html", "", "image/svg+xml"]) {
      expect(attachmentObjectPath({ businessId: BUSINESS, moduleKey: "m", filename: "a", contentType: type, id: "i" })).toBeNull();
    }
  });

  test("an empty or dot-only name still yields a safe object key", () => {
    const path = attachmentObjectPath({ businessId: BUSINESS, moduleKey: "m", filename: "...", contentType: "image/png", id: "i" });
    expect(path).toBe(`${BUSINESS}/m/i/hujjat.png`);
  });

  test("attachments live in the private bucket", () => {
    expect(ATTACHMENT_BUCKET).toBe("crm_attachments");
  });
});

describe("medical audit journal", () => {
  const source = readFileSync(fileURLToPath(new URL("./crm-config.functions.ts", import.meta.url)), "utf8");

  test("every medical.* action the server writes has a journal label", () => {
    // "medical.view" is a permission name, not a journalled action.
    const written = new Set(
      (source.match(/"medical\.[a-z_]+"/g) ?? [])
        .map((raw) => raw.replaceAll('"', ""))
        .filter((action) => action !== "medical.view"),
    );
    expect(written.size).toBeGreaterThan(4);
    for (const action of written) {
      expect(medicalAuditLabel(action)).not.toBe(action);
    }
    for (const action of Object.keys(MEDICAL_AUDIT_ACTIONS)) {
      expect(source).toContain(`"${action}"`);
    }
  });

  test("journal labels are translated in every language", () => {
    for (const label of Object.values(MEDICAL_AUDIT_ACTIONS)) {
      for (const table of [en, ru, kaa]) {
        expect(Object.prototype.hasOwnProperty.call(table, label)).toBe(true);
      }
    }
  });
});
