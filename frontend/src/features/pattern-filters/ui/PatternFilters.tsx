import { Select } from '@/shared/ui/Select';

type PatternFiltersValue = {
  eventType: string;
  relationshipType: string;
  windowDays: string;
};

type PatternFiltersProps = {
  value: PatternFiltersValue;
  eventTypes: string[];
  relationshipTypes: string[];
  onChange: (value: PatternFiltersValue) => void;
};

export function PatternFilters({ value, eventTypes, relationshipTypes, onChange }: PatternFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Select label="Trigger event" name="eventType" value={value.eventType} onChange={(event) => onChange({ ...value, eventType: event.target.value })}>
        <option value="">All event types</option>
        {eventTypes.map((eventType) => (
          <option key={eventType} value={eventType}>
            {eventType.replace(/_/g, ' ')}
          </option>
        ))}
      </Select>
      <Select
        label="Relationship"
        name="relationshipType"
        value={value.relationshipType}
        onChange={(event) => onChange({ ...value, relationshipType: event.target.value })}
      >
        <option value="">All relationships</option>
        {relationshipTypes.map((relationshipType) => (
          <option key={relationshipType} value={relationshipType}>
            {relationshipType.replace(/_/g, ' ')}
          </option>
        ))}
      </Select>
      <Select label="Window" name="windowDays" value={value.windowDays} onChange={(event) => onChange({ ...value, windowDays: event.target.value })}>
        <option value="">All windows</option>
        <option value="1">1 day</option>
        <option value="5">5 days</option>
        <option value="10">10 days</option>
      </Select>
    </div>
  );
}
