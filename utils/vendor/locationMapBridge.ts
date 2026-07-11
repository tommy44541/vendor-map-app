type FlyToFn = (lat: number, lng: number) => void;

let _flyTo: FlyToFn | null = null;

export const locationMapBridge = {
  register: (fn: FlyToFn) => { _flyTo = fn; },
  unregister: () => { _flyTo = null; },
  flyTo: (lat: number, lng: number) => { _flyTo?.(lat, lng); },
};
