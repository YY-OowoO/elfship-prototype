import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

export const iosOut = CustomEase.create("iosOut", "M0,0 C0.22,1 0.36,1 1,1");
export const iosIn = CustomEase.create("iosIn", "M0,0 C0.55,0 0.78,0 1,1");
export const iosSpring = CustomEase.create("iosSpring", "M0,0 C0.16,1 0.3,1.16 1,1");
