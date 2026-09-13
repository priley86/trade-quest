declare module "money" {
  const fx: {
    base: string;
    rates: Record<string, number>;
    convert(value: number, options: { from: string; to: string }): number;
  };
  export default fx;
}
