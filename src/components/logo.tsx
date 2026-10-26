import type { CSSProperties } from 'react'

/**
 * PhishSafe brand logo — "The Guarded Hook".
 * A shield whose interior hook-and-barb resolves into a checkmark, in the
 * brand green gradient (#22C786 → #6EE7B7).
 *
 * `LogoIcon` is the icon-only mark (square, 1:1) — use it in the nav, sidebar,
 * favicon, and anywhere a compact brand badge is needed.
 * `Logo` is the full horizontal lockup (icon + "PhishSafe" wordmark).
 */

// Compound vector paths in a 512x512 coordinate system.
const SHIELD_AND_HOOK_SHANK =
    'M 264 60 L 264 119.3 C 276.6 122.9 286 134.5 286 148 C 286 160.8 277.9 171.7 266.5 175.9 C 264 191 271 203 283 219 C 289 227 294 234 297 241 L 279 263 C 274 253 267 244 259 233 C 245 214 236 196 240.8 173.9 C 231.9 168.7 226 159.1 226 148 C 226 134.5 235.4 122.9 248 119.3 L 248 103 C 214 121 176 133 134 140 C 136 254 182 341 256 393 C 321 347 364 273 374 192 L 405 154 C 396 266 344 367 256 432 C 162 372 106 268 104 114 C 162 106 218 87 256 60 Z M 256 136 A 12 12 0 1 0 256 160 A 12 12 0 1 0 256 136 Z'

const RIGHT_WING_AND_BARBED_CHECK =
    'M 281 74 C 318 94 361 107 408 114 L 408 128 L 251 352 C 198 312 178 265 189 197 L 223 245 L 206 246 C 208 273 221 294 242 307 C 246 309 250 308 253 304 L 375 135 C 341 129 310 120 281 106 Z'

type LogoIconProps = {
    size?: number
    className?: string
    style?: CSSProperties
    /** Unique suffix so multiple instances don't share gradient IDs. */
    idSuffix?: string
}

export function LogoIcon({ size = 32, className, style, idSuffix = 'default' }: LogoIconProps) {
    const shieldGrad = `psShield_${idSuffix}`
    const checkGrad = `psCheck_${idSuffix}`
    return (
        <svg
            viewBox="0 0 512 512"
            width={size}
            height={size}
            fill="none"
            className={className}
            style={style}
            role="img"
            aria-label="PhishSafe"
        >
            <defs>
                <linearGradient id={shieldGrad} x1="15%" y1="15%" x2="88%" y2="85%">
                    <stop offset="0%" stopColor="#22C786" />
                    <stop offset="55%" stopColor="#38D698" />
                    <stop offset="100%" stopColor="#6EE7B7" />
                </linearGradient>
                <linearGradient id={checkGrad} x1="10%" y1="85%" x2="92%" y2="12%">
                    <stop offset="0%" stopColor="#29CC8B" />
                    <stop offset="50%" stopColor="#4CE0A6" />
                    <stop offset="100%" stopColor="#75E9BC" />
                </linearGradient>
            </defs>
            <path fill={`url(#${shieldGrad})`} fillRule="evenodd" clipRule="evenodd" d={SHIELD_AND_HOOK_SHANK} />
            <path fill={`url(#${checkGrad})`} d={RIGHT_WING_AND_BARBED_CHECK} />
        </svg>
    )
}

type LogoProps = {
    iconSize?: number
    className?: string
    /** Color of the "Phish" portion of the wordmark. Defaults to currentColor. */
    wordmarkColor?: string
    idSuffix?: string
}

/**
 * Full horizontal lockup: the icon followed by the "PhishSafe" wordmark.
 * "Phish" uses `wordmarkColor` (default currentColor so it adapts to theme);
 * "Safe" uses the brand green.
 */
export function Logo({ iconSize = 32, className, wordmarkColor = 'currentColor', idSuffix = 'lockup' }: LogoProps) {
    return (
        <span
            className={className}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1 }}
        >
            <LogoIcon size={iconSize} idSuffix={idSuffix} />
            <span style={{ fontWeight: 700, letterSpacing: '-0.5px', fontSize: iconSize * 0.72 }}>
                <span style={{ color: wordmarkColor }}>Phish</span>
                <span style={{ color: '#22C786' }}>Safe</span>
            </span>
        </span>
    )
}

export default Logo
