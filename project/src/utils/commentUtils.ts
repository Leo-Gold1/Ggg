export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count}${interval.label.charAt(0)}`;
    }
  }

  return 'now';
}

export function parseMentions(content: string): { text: string; mentions: string[] } {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return { text: content, mentions };
}

export function renderCommentContent(content: string): string {
  let rendered = content;

  rendered = rendered.replace(/@(\w+)/g, '<span class="text-blue-600 font-medium">@$1</span>');

  rendered = rendered.replace(/\|\|(.*?)\|\|/g, '<span class="spoiler cursor-pointer bg-gray-800 hover:bg-transparent transition-colors">$1</span>');

  return rendered;
}

export function extractLinks(content: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.match(urlRegex) || [];
}

export function validateComment(content: string, maxLinks: number = 3): { valid: boolean; error?: string } {
  if (!content.trim()) {
    return { valid: false, error: 'Comment cannot be empty' };
  }

  if (content.length > 5000) {
    return { valid: false, error: 'Comment is too long (max 5000 characters)' };
  }

  const links = extractLinks(content);
  if (links.length > maxLinks) {
    return { valid: false, error: `Too many links (max ${maxLinks})` };
  }

  return { valid: true };
}

export function checkSpoilers(content: string): boolean {
  return /\|\|.*?\|\|/.test(content);
}
