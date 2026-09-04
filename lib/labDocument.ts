export interface LabRow {
  test: string;
  result: string;
  units: string;
  unitsSpoken: string;
  range: string;
  rangeSpoken: string;
  /** Extraction confidence 0–1. Low values are surfaced as "needs review" and never read as fact. */
  confidence: number;
}

export interface LabDocument {
  title: string;
  detectedType: string;
  collected: string;
  columns: string[];
  rows: LabRow[];
}

export const LAB_DOCUMENT: LabDocument = {
  title: "Basic Metabolic Panel — Lab Results",
  detectedType: "laboratory results report",
  collected: "Collected 12 Aug 2026",
  columns: ["Test", "Result", "Units", "Reference range"],
  rows: [
    {
      test: "Hemoglobin",
      result: "13.8",
      units: "g/dL",
      unitsSpoken: "grams per deciliter",
      range: "12.0–15.5",
      rangeSpoken: "12.0 to 15.5",
      confidence: 0.98,
    },
    {
      test: "Glucose",
      result: "108",
      units: "mg/dL",
      unitsSpoken: "milligrams per deciliter",
      range: "70–99",
      rangeSpoken: "70 to 99",
      confidence: 0.97,
    },
    {
      test: "Creatinine",
      result: "0.8",
      units: "mg/dL",
      unitsSpoken: "milligrams per deciliter",
      range: "0.6–1.1",
      rangeSpoken: "0.6 to 1.1",
      confidence: 0.96,
    },
    {
      test: "HbA1c",
      result: "5.7",
      units: "%",
      unitsSpoken: "percent",
      range: "4.0–5.6",
      rangeSpoken: "4.0 to 5.6",
      confidence: 0.95,
    },
    {
      test: "Potassium",
      result: "4.?",
      units: "mmol/L",
      unitsSpoken: "millimoles per liter",
      range: "3.5–5.1",
      rangeSpoken: "3.5 to 5.1",
      confidence: 0.41,
    },
  ],
};

export const LOW_CONFIDENCE_THRESHOLD = 0.75;

/** Spoken sentence that keeps label, value, units and range together. */
export function rowToSpeech(row: LabRow): string {
  if (row.confidence < LOW_CONFIDENCE_THRESHOLD) {
    return `${row.test}. I can't read this value confidently enough to tell you safely. I've marked it for review. The reference range printed on the document is ${row.rangeSpoken} ${row.unitsSpoken}.`;
  }
  return `${row.test}. Result: ${row.result} ${row.unitsSpoken}. The reference range printed on the document is ${row.rangeSpoken}.`;
}

export function documentToSpeech(doc: LabDocument): string {
  const parts = [
    `This appears to be a ${doc.detectedType} titled ${doc.title}. It has ${doc.rows.length} rows, each with a test name, a result, units, and the reference range printed on the document. I will read each row keeping every value with its label. I won't interpret whether any result is normal or abnormal.`,
  ];
  for (const row of doc.rows) parts.push(rowToSpeech(row));
  parts.push("That is the end of the document.");
  return parts.join(" ");
}
