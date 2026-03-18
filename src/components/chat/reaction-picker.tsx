const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
}

export function ReactionPicker({ onSelect }: ReactionPickerProps) {
  return (
    <div className="flex gap-1 rounded-full bg-popover border shadow-lg px-2 py-1">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          className="hover:scale-125 transition-transform text-lg p-0.5"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
