import { View, Text } from "react-native";
import { Card } from "@/components/shared/ui";

type Testimonial = {
  username: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    username: "mr.barker",
    quote: "I used to grade until midnight Sunday. Now I'm done before my kids' bedtime.",
  },
  {
    username: "dmc_teaches",
    quote:
      "the OCR caught a 'mitochondria' that I had as 'mitochondira' on the answer key. embarrassing for me, lifesaver.",
  },
  {
    username: "lina.j",
    quote: "30 students, 1 photo each, 12 minutes total. it's wild.",
  },
];

export default function SocialProofCard() {
  return (
    <Card className="gap-5">
      <Text className="text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
        Teachers using graider
      </Text>
      <View className="gap-5">
        {TESTIMONIALS.map((t) => (
          <View key={t.username} className="flex-row items-start gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-cream-deep shadow-paper">
              <Text className="font-display text-sm font-bold text-ink">
                {t.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-bold text-ink-faint">@{t.username}</Text>
              <Text className="mt-0.5 text-sm leading-relaxed text-ink">"{t.quote}"</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
