declare module "merge" {
  function merge<A, B>(a: A, ...b: B[]): A & B;

  export = merge
}
