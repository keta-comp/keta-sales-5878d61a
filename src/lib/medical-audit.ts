/**
 * Patient-data audit actions written by the CRM server functions, with the label the tenant's
 * journal shows. A new `medical.*` action must be listed here too — a test enforces that.
 */
export const MEDICAL_AUDIT_ACTIONS: Record<string, string> = {
  "medical.records_listed": "Ro‘yxatni ochdi",
  "medical.record_saved": "Yozuvni saqladi",
  "medical.record_deleted": "Yozuvni o‘chirdi",
  "medical.file_opened": "Faylni ochdi",
  "medical.read_denied": "Ochishga urindi — rad etildi",
  "medical.write_denied": "Yozishga urindi — rad etildi",
};

export function medicalAuditLabel(action: string): string {
  return MEDICAL_AUDIT_ACTIONS[action] ?? action;
}
