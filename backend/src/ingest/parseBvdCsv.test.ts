import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BvdCsvFormatError, parseBvdCsv } from "./parseBvdCsv.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dirname, "../../../data/bvd");

const augustFile = () =>
  readFileSync(path.join(dataDir, "pcn-usd-9206810-981.csv"));

const januaryFile = () =>
  readFileSync(path.join(dataDir, "2026-01/pcn-usd-7968664-981.csv"));

describe("parseBvdCsv", () => {
  it("parses the August sheet to 605 rows with the header's effective date and company id", () => {
    const parsed = parseBvdCsv(augustFile());
    expect(parsed.rows).toHaveLength(605);
    expect(parsed.effectiveDate).toBe("2026-08-22");
    expect(parsed.companyId).toBe("981");
  });

  it("parses a January file to 594 rows", () => {
    const parsed = parseBvdCsv(januaryFile());
    expect(parsed.rows).toHaveLength(594);
    expect(parsed.effectiveDate).toBe("2026-01-01");
  });

  it("normalises all 15 columns, tolerating stray header whitespace", () => {
    const input = [
      '"Company Id: ",981," ","Company Name: ","2043733 ONTARIO INC."," ",DBA,"CH LOGISTIX"," ","Effective Date: ",2026-08-22',
      'SITE,NAME, CITY ,STATE,PROD,COST,"FEDERAL  TAX","STATE TAX","SALES TAX",FREIGHT,OTHER,"TOTAL COST","RETAIL  PRICE","YOUR PRICE",SAVINGS',
      '1277,"LOVES #368",Clanton,AL,ULSD,4.5215,0.2483,0.3175,0,0.1187,0.02,5.226,5.689,5.226,0.463',
    ].join("\n");

    const parsed = parseBvdCsv(input);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      site: "1277",
      name: "LOVES #368",
      city: "Clanton",
      state: "AL",
      prod: "ULSD",
    });
  });

  it("excludes the metadata row from the data rows", () => {
    const parsed = parseBvdCsv(augustFile());
    for (const row of parsed.rows) {
      expect(row.site).not.toBe("Company Id: ");
    }
    expect(parsed.rows[0]?.site).toBe("1277");
  });

  it("rejects a file whose header shape differs, rather than coercing it", () => {
    const input = [
      '"Company Id: ",981," ","Company Name: ","2043733 ONTARIO INC."," ",DBA,"CH LOGISTIX"," ","Effective Date: ",2026-08-22',
      "SITE,NAME,CITY,STATE,PRODUCT,COST,\"FEDERAL TAX\",\"STATE TAX\",\"SALES TAX\",FREIGHT,OTHER,\"TOTAL COST\",\"RETAIL PRICE\",\"YOUR PRICE\",SAVINGS",
      '1277,"LOVES #368",Clanton,AL,ULSD,4.5215,0.2483,0.3175,0,0.1187,0.02,5.226,5.689,5.226,0.463',
    ].join("\n");

    expect(() => parseBvdCsv(input)).toThrow(BvdCsvFormatError);
  });
});
