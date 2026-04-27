import { emit, subscribe } from './eventBus';

// ─── Types ────────────────────────────────────────────────────────

type EmergencyRequest = {
  id: string;
  patientId: string;
  issueType: string;
  severity: string;
  languages: string[];
  primaryLanguage: string;
  location: string;
  status: 'searching' | 'assigned';
  assignedDoctorId?: string;
};

// ─── Store ────────────────────────────────────────────────────────

const emergencyStore: EmergencyRequest[] = [];

// ─── Utils ────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ─── Doctor Selection ─────────────────────────────────────────────

function pickBestDoctor(request: EmergencyRequest): string {
  if (request.primaryLanguage === 'Telugu') return 'doc_telugu_1';
  if (request.primaryLanguage === 'Hindi')  return 'doc_hindi_1';
  return 'doc_general_1';
}

// ─── Matching ─────────────────────────────────────────────────────

function simulateMatching(request: EmergencyRequest): void {
  setTimeout(() => {
    const doctorId = pickBestDoctor(request);

    request.status = 'assigned';
    request.assignedDoctorId = doctorId;

    emit('EMERGENCY_ASSIGNED', request);
  }, 2000 + Math.random() * 2000);
}

// ─── Public API ───────────────────────────────────────────────────

export function createEmergencyRequest(
  data: Omit<EmergencyRequest, 'id' | 'status'>,
): string {
  const request: EmergencyRequest = {
    id: generateId(),
    ...data,
    status: 'searching',
  };

  emergencyStore.push(request);
  emit('EMERGENCY_CREATED', request);
  simulateMatching(request);

  return request.id;
}

export function listenToEmergency(
  requestId: string,
  callback: (req: EmergencyRequest) => void,
): () => void {
  return subscribe('EMERGENCY_ASSIGNED', (req: EmergencyRequest) => {
    if (req.id === requestId) callback(req);
  });
}

export function listenForDoctorRequests(
  doctorId: string,
  callback: (req: EmergencyRequest) => void,
): () => void {
  return subscribe('EMERGENCY_CREATED', (req: EmergencyRequest) => {
    setTimeout(() => {
      if (pickBestDoctor(req) === doctorId) callback(req);
    }, 1000);
  });
}

export function respondToEmergency(
  requestId: string,
  doctorId: string,
  response: 'accepted' | 'declined',
): void {
  const req = emergencyStore.find((r) => r.id === requestId);
  if (!req) return;

  if (response === 'accepted') {
    req.status = 'assigned';
    req.assignedDoctorId = doctorId;
    emit('EMERGENCY_ASSIGNED', req);
  }
}
