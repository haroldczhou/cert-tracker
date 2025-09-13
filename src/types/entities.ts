export interface BaseEntity {
  id: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface District extends BaseEntity {
  type: 'district';
  name: string;
}

export interface School extends BaseEntity {
  type: 'school';
  districtId: string;
  name: string;
}

export interface Profile extends BaseEntity {
  type: 'profile';
  id: string; // This is the authUid from Entra
  districtId: string;
  schoolId?: string;
  roleKey: string;
}

export interface Person extends BaseEntity {
  type: 'person';
  districtId: string;
  schoolId: string;
  roleKey: string;
  fullName: string;
  email: string;
  authUid?: string;
  active: boolean;
}

export interface CertType extends BaseEntity {
  type: 'certType';
  id: string; // This is the key
  name: string;
  defaultValidMonths: number;
}

export interface Cert extends BaseEntity {
  type: 'cert';
  districtId: string;
  schoolId: string;
  personId: string;
  certTypeKey: string;
  issueDate: Date;
  expiryDate: Date;
  currentEvidenceId?: string | null;
  status: 'valid' | 'expiring' | 'expired';
}

export interface Reminder extends BaseEntity {
  type: 'reminder';
  certId: string;
  sendAt: Date;
  channel: 'email';
  to: string;
  status: 'pending' | 'sent' | 'failed';
  providerId?: string;
}

export interface Audit extends BaseEntity {
  type: 'audit';
  actorUid: string;
  action: string;
  entityType: string;
  entityId: string;
  meta: Record<string, unknown>;
}

export type Entity = District | School | Profile | Person | CertType | Cert | Reminder | Audit;

export interface CertEvidence extends BaseEntity {
  type: 'certEvidence';
  districtId: string;
  certId: string;
  blobPath: string;
  sha256?: string | null;
  size?: number | null;
  contentType?: string | null;
  uploadedByUid?: string | null;
  uploadedAt?: Date | null;
  status?: 'pending' | 'complete';
  fileName?: string | null;
}

export interface CreatePersonRequest {
  fullName: string;
  email: string;
  roleKey: string;
  schoolId: string;
}

export interface CreateCertRequest {
  personId: string;
  certTypeKey: string;
  issueDate: string;
  expiryDate: string;
}
