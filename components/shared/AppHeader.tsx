import { View } from "react-native";
import { Link } from "expo-router";
import { BrandMark, Wordmark } from "@/components/shared/Brand";

type AppHeaderProps = {
  href: string;
  rightSlot: React.ReactNode;
  variant?: "solid" | "translucent";
};

export default function AppHeader({ href, rightSlot, variant = "solid" }: AppHeaderProps) {
  const wrapperClass =
    variant === "translucent"
      ? "border-b border-line/60 bg-cream/75"
      : "border-b border-line bg-paper/90";

  return (
    <View className={wrapperClass}>
      <View className="px-4">
        <View className="flex-row h-14 items-center justify-between">
          <Link href={href as any} className="flex-row items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <Wordmark className="text-xl" />
          </Link>
          <View className="flex-row items-center gap-3">{rightSlot}</View>
        </View>
      </View>
    </View>
  );
}
