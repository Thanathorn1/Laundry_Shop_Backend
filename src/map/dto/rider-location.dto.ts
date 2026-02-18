export class RiderLocationDto {
  riderId: string;
  location: { type?: 'Point'; coordinates: [number, number] } | { lat: number; lng: number };
}
