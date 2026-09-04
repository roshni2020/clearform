import type { Explanation } from "./types";

/**
 * Built-in plain-language glossary. Used as the fallback when Linkup is not
 * configured or returns nothing usable. Every entry points to an official source.
 */
const GLOSSARY: Record<string, Omit<Explanation, "term" | "provider" | "trusted">> = {
  "prior authorization": {
    explanation:
      "Prior authorization means your health plan must approve a medicine, test or service before it agrees to pay for it. Your doctor usually sends the request. It is not a guarantee of payment.",
    sourceName: "HealthCare.gov glossary",
    sourceUrl: "https://www.healthcare.gov/glossary/preauthorization/",
  },
  deductible: {
    explanation:
      "A deductible is the amount you pay for covered health care each year before your insurance starts to pay. After you meet it, you usually pay only a copay or coinsurance.",
    sourceName: "HealthCare.gov glossary",
    sourceUrl: "https://www.healthcare.gov/glossary/deductible/",
  },
  copay: {
    explanation:
      "A copay is a fixed amount you pay for a covered service, such as a doctor visit, usually at the time you receive the service.",
    sourceName: "HealthCare.gov glossary",
    sourceUrl: "https://www.healthcare.gov/glossary/co-payment/",
  },
  coinsurance: {
    explanation:
      "Coinsurance is the percentage of a covered service you pay after you have met your deductible. For example, with 20 percent coinsurance you pay 20 percent and the plan pays 80 percent.",
    sourceName: "HealthCare.gov glossary",
    sourceUrl: "https://www.healthcare.gov/glossary/co-insurance/",
  },
  hba1c: {
    explanation:
      "HbA1c, also called the A1C test, measures your average blood sugar level over about the past three months. Your doctor uses it alongside other information; the document itself does not say what your result means for you.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/",
  },
  hemoglobin: {
    explanation:
      "Hemoglobin is the protein in red blood cells that carries oxygen. A hemoglobin test measures how much of it is in your blood.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/lab-tests/hemoglobin-test/",
  },
  glucose: {
    explanation:
      "Glucose is the main sugar in your blood and your body's main source of energy. A blood glucose test measures how much glucose is in your blood at the time of the test.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/lab-tests/blood-glucose-test/",
  },
  creatinine: {
    explanation:
      "Creatinine is a waste product made by your muscles. A creatinine test is commonly used to check how well your kidneys are filtering your blood.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/lab-tests/creatinine-test/",
  },
  potassium: {
    explanation:
      "Potassium is a mineral your body needs for your nerves, muscles and heart to work properly. A potassium blood test measures the amount in your blood.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/lab-tests/potassium-blood-test/",
  },
  "reference range": {
    explanation:
      "A reference range is the set of values a laboratory considers typical for that test. Ranges vary between labs. Only your health care provider can tell you what a result means for you.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/",
  },
  "policy number": {
    explanation:
      "A policy number, sometimes called a member ID, identifies your specific insurance plan. It is printed on your insurance card and is needed so the clinic can bill your insurer.",
    sourceName: "CMS.gov",
    sourceUrl: "https://www.cms.gov/",
  },
  "primary care physician": {
    explanation:
      "A primary care physician is the main doctor you see for regular check-ups and everyday health needs. They can refer you to specialists when needed.",
    sourceName: "HealthCare.gov glossary",
    sourceUrl: "https://www.healthcare.gov/glossary/primary-care-physician/",
  },
  "emergency contact": {
    explanation:
      "An emergency contact is a person the clinic can call if there is an urgent situation involving you. Choose someone who is easy to reach.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/",
  },
  "patient registration form": {
    explanation:
      "A patient registration form collects your basic identity, contact, insurance and health-history details so a clinic can create your record, contact you, and bill your insurer correctly.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/",
  },
  "cms-1500": {
    explanation:
      "Form CMS-1500 is the standard paper claim form used by health care providers to bill Medicare and many other insurers for services.",
    sourceName: "CMS.gov",
    sourceUrl: "https://www.cms.gov/medicare/billing/electronicbillingeditrans/16_1500",
  },
  allergy: {
    explanation:
      "An allergy is a reaction by your immune system to a substance that is normally harmless, such as a medicine, food or pollen. Clinics ask so they can avoid giving you something that could cause a reaction.",
    sourceName: "MedlinePlus (NIH)",
    sourceUrl: "https://medlineplus.gov/allergy.html",
  },
};

const ALIASES: Record<string, string> = {
  allergies: "allergy",
  "a1c": "hba1c",
  "hemoglobin a1c": "hba1c",
  "co-pay": "copay",
  copayment: "copay",
  "pre-authorization": "prior authorization",
  preauthorization: "prior authorization",
  "prior auth": "prior authorization",
  "what is this form used for": "patient registration form",
  "what is this form for": "patient registration form",
  "what is this document": "patient registration form",
  "this form": "patient registration form",
  "pcp": "primary care physician",
  "member id": "policy number",
  "reference ranges": "reference range",
  "normal range": "reference range",
};

export function normalizeTerm(input: string): string {
  return input
    .toLowerCase()
    .replace(/[?.!,]/g, "")
    .replace(/^(what does|what is|what's|whats|explain|define|tell me about|meaning of)\s+/g, "")
    .replace(/^(a|an|the)\s+/g, "")
    .replace(/\s+(mean|means|stand for)$/g, "")
    .trim();
}

export function lookupGlossary(term: string): Explanation | null {
  const normalized = normalizeTerm(term);
  const key = ALIASES[normalized] ?? normalized;
  const direct = GLOSSARY[key];
  if (direct) return { term: key, provider: "glossary", trusted: true, ...direct };
  // Fuzzy: find a glossary key contained in the question.
  for (const k of Object.keys(GLOSSARY)) {
    if (normalized.includes(k)) return { term: k, provider: "glossary", trusted: true, ...GLOSSARY[k] };
  }
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (normalized.includes(alias)) return { term: target, provider: "glossary", trusted: true, ...GLOSSARY[target] };
  }
  return null;
}

export const GLOSSARY_TERMS = Object.keys(GLOSSARY);
