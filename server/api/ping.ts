export default function handler(req: any, res: any) {
  res.status(200).json({ status: "Vivant", time: new Date().toISOString() });
}