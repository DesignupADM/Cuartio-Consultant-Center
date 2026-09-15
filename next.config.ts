import type {NextConfig} from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const isProduction = process.env.NODE_ENV === 'production';

function buildContentSecurityPolicy(frameAncestors: string) {
  return [
    "default-src 'self'",
    // TinyMCE compiles internal code at runtime and Next.js hydrates with inline
    // scripts, so both are required for the admin editors to work.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.googleapis.com https://*.googleusercontent.com https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com https://*.cloudfunctions.net https://*.run.app https://firebasestorage.googleapis.com",
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://content.googleapis.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
}

// Comma-separated list of origins allowed to frame /embed/* (e.g.
// "https://curatiofoundation.org, https://www.curatiofoundation.org").
// Defaults to any origin because the registration form is public.
const embedAllowedOrigins =
  (process.env.EMBED_ALLOWED_ORIGINS || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .join(' ') || '*';

const baseSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const defaultHeaders = [
  ...baseSecurityHeaders,
  { key: 'X-Frame-Options', value: 'DENY' },
];

const embedHeaders = [...baseSecurityHeaders];

// HSTS and CSP are only applied to production responses so local development
// (Turbopack HMR, eval-based tooling) keeps working unchanged.
if (isProduction) {
  defaultHeaders.push(
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy("'none'") },
  );
  embedHeaders.push(
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(embedAllowedOrigins) },
  );
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // The public registration form is the only surface that may be framed
        // by third-party sites; every other route keeps clickjacking protection.
        source: '/((?!embed).*)',
        headers: defaultHeaders,
      },
      {
        source: '/embed/:path*',
        headers: embedHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
