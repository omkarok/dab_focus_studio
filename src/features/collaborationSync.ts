// Placeholder for collaboration and sync features.
// TODO: implement account handling and real-time sync.

export interface SyncPayload {
  tasks: any[];
  updatedAt: string;
}

export async function syncToServer(payload: SyncPayload): Promise<void> {
  // This will eventually POST to a backend service.
  console.log("sync payload", payload);
}
