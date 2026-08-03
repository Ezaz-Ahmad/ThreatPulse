import { next } from '@vercel/functions';

// Old auto-generated Vercel deployment domain we no longer want people using.
const OLD_HOST = 'threat-pulse-phi.vercel.app';
const NEW_HOST = 'www.getthreatpulse.com';

export default function middleware(request) {
  const url = new URL(request.url);

  if (url.hostname === OLD_HOST) {
    url.hostname = NEW_HOST;
    return Response.redirect(url, 301);
  }

  return next();
}
