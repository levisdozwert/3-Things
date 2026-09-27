import type { ShareResult } from "../share";

interface Invite {
  asker: string;
  question: string;
  link: string;
  /** A gentle nudge the user chose to send. Never automatic. */
  reminder?: boolean;
}

/** The words that travel with the link, through whatever the user already uses to talk. */
export function inviteText({ asker, question, reminder }: Omit<Invite, "link">): string {
  const who = asker.trim();
  if (reminder) {
    return `A gentle reminder${who ? ` from ${who}` : ""}, whenever suits you: “${question}” You can answer by voice here:`;
  }
  return `${who || "Someone"} would love your 3 Things: “${question}” Answer by voice, whenever suits you:`;
}

/** The system share sheet (Messages, WhatsApp, email…), or the clipboard where there isn't one. */
export async function shareInvite(invite: Invite): Promise<ShareResult> {
  const text = inviteText(invite);
  const data = { title: "3 Things", text, url: invite.link };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  return copyInvite(invite);
}

export async function copyInvite(invite: Invite, { linkOnly = false } = {}): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(linkOnly ? invite.link : `${inviteText(invite)} ${invite.link}`);
    return "copied";
  } catch {
    return "failed";
  }
}
