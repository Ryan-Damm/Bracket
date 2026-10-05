// Change this ONE color to restyle the whole bracket.
// The other colors are calculated from it.
const MAIN_COLOR = "#030001";

function hexToHsl(hex) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    const d = max - min;

    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r: h = ((g - b) / d) % 6; break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4; break;
        }
        h *= 60;
        if (h < 0) h += 360;
    }

    return [h, s * 100, l * 100];
}

const [h, s, l] = hexToHsl(MAIN_COLOR);
const root = document.documentElement;

root.style.setProperty("--accent", MAIN_COLOR);
root.style.setProperty("--accent-light", `hsl(${h}, ${Math.min(s, 75)}%, ${Math.min(l + 28, 92)}%)`);
root.style.setProperty("--accent-dark", `hsl(${h}, ${Math.min(s + 8, 90)}%, ${Math.max(l - 18, 25)}%)`);
root.style.setProperty("--accent-soft", `hsl(${h}, ${Math.min(s, 70)}%, 94%)`);
root.style.setProperty("--accent-complement", `hsl(${(h + 180) % 360}, ${Math.min(s, 65)}%, 48%)`);
