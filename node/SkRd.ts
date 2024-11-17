export function randomArr<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}