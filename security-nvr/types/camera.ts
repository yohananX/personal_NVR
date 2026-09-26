export type Camera = {
  id: number;
  name: string;
  path: string;
  created_at?: string;
  last_recording_at?: string | null;
  recordings_24h?: number;
};