declare module "merge" {
  export default function merge<A, B>(a: A, ...b: B[]): A & B;
}
