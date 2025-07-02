import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_EVENT_TYPES, getEventTypeDisplayName } from "@/lib/eventUtils";

interface EventTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
}

export function EventTypeSelect({ value, onValueChange, id }: EventTypeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_EVENT_TYPES.map(type => (
          <SelectItem key={type} value={type}>
            {getEventTypeDisplayName(type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}