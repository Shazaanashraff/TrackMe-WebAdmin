import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function getRelative(date) {
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(date),
  );
}

function getAbsolute(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Colombo',
    timeZoneName: 'short',
  }).format(new Date(date));
}

export function RelativeTime({ date }) {
  if (!date) return null;
  const relative = getRelative(date);
  const absolute = getAbsolute(date);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={new Date(date).toISOString()}
          className="text-sm text-muted-foreground cursor-default"
        >
          {relative}
        </time>
      </TooltipTrigger>
      <TooltipContent>
        <p>{absolute}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export { getRelative, getAbsolute };
