import { lerp } from 'src/app/math/lerp';

/** Internal representation useful for lerping colors. */
export interface Color {
    /** Red value from 0 to 255, inclusive. */
    r: number;

    /** Green value from 0 to 255, inclusive. */
    g: number;

    /** Blue value from 0 to 255, inclusive. */
    b: number;

    /** Alpha value from 0 to 1, inclusive. */
    a: number;
}

/** 
 * Expects parameter to be of format '#RRGGBB' or '#RRGGBBAA'.  
 * Alpha defaults to 1 if not supplied.
 */
export function hexStringToColor(hex: string): Color {
    const alpha = hex.length > 7
        ? parseInt(hex.substring(7, 9), 16) / 255
        : 1;
    return {
        r: parseInt(hex.substring(1, 3), 16),
        g: parseInt(hex.substring(3, 5), 16),
        b: parseInt(hex.substring(5, 7), 16),
        a: alpha,
    };
}

export function rgbaToColor(r: number, g: number, b: number, a: number): Color {
    if (r > 255 || g > 255 || b > 255 || a > 1 || r < 0 || g < 0 || b < 0 || a < 0) {
        throw new Error(`Invalid rgbaToColor params: ${r}, ${g}, ${b}, ${a}`);
    }
    return { r, g, b, a };
}

/** Returns a css color string for use with stroke/fill style. */
export function colorToString(color: Color): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

export function lerpColors(c1: Color, c2: Color, t: number): Color {
    return {
        r: lerp(c1.r, c2.r, t),
        g: lerp(c1.g, c2.g, t),
        b: lerp(c1.b, c2.b, t),
        a: lerp(c1.a, c2.a, t),
    }
}