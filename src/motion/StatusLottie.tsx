import { Lottie } from "lottie-react";
import check from "./lottie/check.json";
import pulse from "./lottie/pulse.json";
import { prefersReduce } from "./prefers";

export function CheckLottie({ className }: { className?: string }) {
  if (prefersReduce()) return null;
  return <Lottie className={className} src={check} loop={false} autoplay style={{ width: 28, height: 28 }} />;
}

export function PulseLottie({ className }: { className?: string }) {
  if (prefersReduce()) return null;
  return <Lottie className={className} src={pulse} loop autoplay style={{ width: 168, height: 168 }} />;
}
