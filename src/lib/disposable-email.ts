// Throwaway inbox providers rejected at company signup. Their inboxes are public
// or self-destructing: no real prospect signs up with them, testers and abusers do.
// Kept inline on purpose (no third-party list to trust); extend when a new one shows up.
const DISPOSABLE_DOMAINS = new Set([
  // Yopmail and its alias domains
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf', 'courriel.fr.nf',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'nospam.ze.tc', 'nomail.xl.cx',
  'mega.zik.dj', 'speed.1s.fr', 'hide.biz.st', 'mymail.infos.st',
  // Mailinator family
  'mailinator.com', 'mailinator.net', 'mailinator2.com', 'notmailinator.com', 'reallymymail.com',
  // Guerrilla Mail family
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamailblock.com', 'sharklasers.com', 'grr.la', 'pokemail.net', 'spam4.me',
  // Temp-mail / 10-minute style services
  'temp-mail.org', 'temp-mail.io', 'tempmail.com', 'tempmail.net', 'tempmailo.com', 'tempr.email',
  'tmpmail.org', 'tmpmail.net', 'tmails.net', '10minutemail.com', '10minutemail.net',
  'minutemail.com', '20minutemail.com', 'dropmail.me', 'emailondeck.com', 'getnada.com', 'nada.email',
  'mohmal.com', 'maildrop.cc', 'mailnesia.com', 'mailcatch.com', 'trashmail.com', 'trashmail.de',
  'trashmail.net', 'mytrashmail.com', 'throwawaymail.com', 'fakeinbox.com', 'dispostable.com',
  'mintemail.com', 'spamgourmet.com', 'jetable.org', 'mail-temp.com', 'emailfake.com',
  'tempinbox.com', 'mailpoof.com', 'burnermail.io', 'inboxkitten.com', 'mail.tm', 'mailsac.com',
  'harakirimail.com', 'luxusmail.org', 'tempail.com', 'byom.de', 'wegwerfmail.de', 'wegwerfmail.net',
  'einrot.com', 'spambog.com', 'discard.email', 'discardmail.com', 'mvrht.com', 'emltmp.com',
  '1secmail.com', '1secmail.net', '1secmail.org', 'tempmailaddress.com', 'fakemail.net',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@').pop() ?? ''
  if (!domain) return false
  // Match the domain itself and any subdomain of a listed domain (e.g. x.mailinator.com)
  const parts = domain.split('.')
  for (let i = 0; i < parts.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join('.'))) return true
  }
  return false
}
