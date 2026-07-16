export type Category = {
  slug: string;
  name: string;
  emoji: string;
  color: string;
};

export const categories: Category[] = [
  { slug: "gmail", name: "Gmail", emoji: "📧", color: "#EA4335" },
  { slug: "facebook", name: "Facebook", emoji: "📘", color: "#1877F2" },
  { slug: "youtube", name: "YouTube", emoji: "▶️", color: "#FF0000" },
  { slug: "discord", name: "Discord", emoji: "🎮", color: "#5865F2" },
  { slug: "tiktok", name: "TikTok", emoji: "🎵", color: "#000000" },
  { slug: "outlook", name: "Outlook", emoji: "📨", color: "#0078D4" },
  { slug: "chatgpt", name: "ChatGPT", emoji: "🤖", color: "#10A37F" },
  { slug: "steam", name: "Steam Key", emoji: "🕹️", color: "#171A21" },
  { slug: "twitter", name: "X / Twitter", emoji: "✖️", color: "#000000" },
  { slug: "boosting", name: "Boosting", emoji: "🚀", color: "#8B5CF6" },
];
