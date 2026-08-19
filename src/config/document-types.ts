/**
 * JSON-LD context URL(s) a document type needs so its credentialSubject fields resolve under
 * core-engine's safe-mode signing. Mirrored by hand from core-engine's own context allowlist --
 * this repo has no dependency on that one, so keep both lists in sync deliberately when
 * core-engine's allowlist changes.
 */
export interface DocumentTypeSpec {
  label: string;
  /** The credentialSubject.type value core-engine/TrustVC expects, when confirmed. */
  credentialSubjectType?: string;
  contextUrls: readonly string[];
  /** false = context URL is allowlisted in core-engine but no worked example/fixture exists
   * anywhere yet -- the exact required credentialSubject shape for this type is unconfirmed. */
  verified: boolean;
}

export const DOCUMENT_TYPES = {
  certificateOfOrigin: {
    label: "Certificate of Origin",
    credentialSubjectType: "Coo",
    contextUrls: ["https://trustvc.io/context/coo.json"],
    verified: true,
  },
  commercialInvoice: {
    label: "Commercial Invoice",
    credentialSubjectType: "Invoice",
    contextUrls: ["https://trustvc.io/context/invoice.json"],
    verified: true,
  },
  billOfLading: {
    label: "Bill of Lading (transferable eBL)",
    credentialSubjectType: "BillOfLading",
    contextUrls: ["https://trustvc.io/context/bill-of-lading.json"],
    verified: true,
  },
  billOfLadingCarrier: {
    label: "Bill of Lading (carrier variant)",
    contextUrls: ["https://trustvc.io/context/bill-of-lading-carrier.json"],
    verified: false,
  },
  promissoryNote: {
    label: "Promissory Note",
    contextUrls: ["https://trustvc.io/context/promissory-note.json"],
    verified: false,
  },
  warehouseReceipt: {
    label: "Warehouse Receipt",
    contextUrls: ["https://trustvc.io/context/warehouse-receipt.json"],
    verified: false,
  },
  openCerts: {
    label: "OpenCerts",
    contextUrls: ["https://trustvc.io/context/opencerts-context.json"],
    verified: false,
  },
} as const satisfies Record<string, DocumentTypeSpec>;

export type DocumentTypeKey = keyof typeof DOCUMENT_TYPES;

export const DOCUMENT_TYPE_KEYS = Object.keys(DOCUMENT_TYPES) as DocumentTypeKey[];

/**
 * Merges a document type's required context URL(s) into a caller-supplied context array, deduped
 * and order-preserving. Returns `existing` unchanged (including `undefined`) when `documentType`
 * is omitted, so callers who don't use this feature see no behavior change at all.
 */
export function mergeDocumentTypeContext(
  existing: readonly string[] | undefined,
  documentType: DocumentTypeKey | undefined
): string[] | undefined {
  if (!documentType) return existing ? [...existing] : existing;
  const base = existing ?? [];
  const additions = DOCUMENT_TYPES[documentType].contextUrls.filter((url) => !base.includes(url));
  return additions.length === 0 ? [...base] : [...base, ...additions];
}
